# Festival schedule / timings — design

Date: 2026-09-04
Branch base: `develop`
Status: implemented — see "As built" at the end for deviations from this text

## Goal

Give an organizer a working **program / timings** for a competition:

- split each competition day into **відділення** (sections) on a venue,
  each with a start time
- place unassigned stage exits (`entries`) into sections, grouped by
  nomination, ordered by running number, with an automatic **award** row
  last
- compute the on-stage time of every position from the section start
  time, the per-exit duration and the configured pause — **never stored,
  always computed on read**
- let the organizer reorder within a section, move an exit to another
  section, and merge nomination groups for display
- publish three projections: a public poster, a personal "my exits"
  view, and an extended working document for the sound engineer
- changing `pauseSeconds` or duration limits does **not** silently
  reflow already-built sections — an explicit "recalculate" action does

Non-goals (this iteration): ZIP music export (old BE-21), a printable
extended-program page (old FE-13), track-length-based timing (no track
durations are measured yet), semifinal round timings.

## Decisions (confirmed with Developer)

1. **`Entry` is the stage exit.** `section_items` point at `entryId`
   directly. No `performances` / `registrations` layer — the old
   2026-08-18 plan assumed one that was never built.
2. **Duration in v1 = limit + improv only.** `improv` → the group /
   individual improv seconds from `competition_rules`; otherwise
   `resolveLimit(nominationId, 'final')`. The `timeSource: 'track'`
   branch behaves exactly like `'limit'` until track measurement exists.
   Documented, not branched.
3. **Round is always `'final'`.** Semifinals are not in the data model.
4. **Days are lazily created**, not generated at competition creation:
   the first `GET /competitions/:id/days` (and section build)
   `findOrCreate`s one row per date in `dateFrom..dateTo`. This keeps
   `competitions` free of a dependency on `schedule`.
5. **Multi-day / multi-venue is in the model** (`dayId`, `venueId` on a
   section); the UI hides the day / venue switchers when there is only
   one of each.
6. **Time is computed on read**, by the server, from a single pure
   function. The client never recomputes — it re-renders whatever the
   server returns after every mutation.
7. **Explicit recalculation.** A separate endpoint + button reflows a
   section. An unpredictable mid-festival time shift is worse than a
   stale schedule.
8. **Merge groups is display-only.** Judging and results keep working by
   the source categories; the merge UI carries that warning.
9. **New bounded context `schedule/`** on the backend, shaped like the
   existing modules (model / module / controller / service / dto /
   constants; classes and constants in their own files; no functions
   passed as parameters — pure helpers are module-level and called
   directly).

## Architecture

```
competition_days (lazy, per date)
      │
      ├─ sections (dayId, venueId, name, startTime, sortOrder)
      │      │
      │      └─ section_items (entryId?, type performance|award,
      │                        nominationGroupKey, sortOrder)
      │
entries (unassigned = not referenced by any section_item)
competition_rules ──> pauseSeconds, improv*Seconds, timeSource
duration_limits ────> resolveLimit(nominationId, 'final')

read path:
  section_items ─┐
  performanceDuration(entry, rules, limitSeconds) ─┐
  calculateSchedule(startSeconds, items, pauseSeconds) ──> positions + times
```

Two pure functions, each in its own file, no DB access, called directly
(not injected):

- `schedule/performance-duration.ts` —
  `performanceDuration(input: PerformanceDurationInput, rules: CompetitionRule): number`
  where `PerformanceDurationInput { improv: boolean; isGroupImprov: boolean; limitSeconds: number }`.
  Branches: `improv` → `isGroupImprov ? rules.improvGroupSeconds : rules.improvIndividualSeconds`;
  else → `limitSeconds`.
- `schedule/calculate-schedule.ts` —
  `calculateSchedule(input: CalculateScheduleInput): ScheduledItem[]`
  where `CalculateScheduleInput { startTimeSeconds: number; pauseSeconds: number; items: ScheduleItemInput[] }`,
  `ScheduleItemInput { id: string; type: 'performance' | 'award'; durationSeconds: number; nominationGroupKey: string | null; isGroupImprov: boolean }`,
  `ScheduledItem = ScheduleItemInput & { startTimeSeconds: number }`.
  Pause is added after every `performance`; for an improv **group** the
  pause is added once per `nominationGroupKey`, not per item; the `award`
  row carries the section end time and no trailing pause.

**Shared access check.** `CompetitionRulesService` has a private
`loadCompetitionAndAssertAccess`. Promote it to
`CompetitionsService.assertAccess(competitionId, userId): Promise<Competition>`
and reuse it from both `competition-rules` and `schedule`. Targeted
cleanup in code we are already touching; no wider refactor.

## Data model

### `competition_days` — new table

`{ id, competitionId, date DATEONLY, label STRING NULL }`,
unique `(competitionId, date)`, FK `competitionId → competitions` cascade.

### `sections` — new table

`{ id, competitionId, dayId, venueId NULL, name, startTime STRING "HH:MM",
   sortOrder INTEGER }`, FKs cascade, index `(competitionId, dayId, sortOrder)`.

### `section_items` — new table

`{ id, sectionId, entryId UUID NULL, type ENUM('performance','award'),
   nominationGroupKey STRING NULL, mergedGroupLabel STRING NULL,
   sortOrder INTEGER }`.
Partial unique index on `entryId WHERE entryId IS NOT NULL` — one exit
belongs to exactly one section. `type = 'award'` rows have
`entryId = null` and are forced last by the service.

### Migrations

1. `create-competition-days`
2. `create-sections`
3. `create-section-items` (+ the two enums, partial unique index)

No change to `entries`, `competitions`, `competition_rules`.

## Backend changes

New module `backend/src/schedule/` — `schedule.module.ts`,
`schedule.controller.ts`, `schedule.service.ts`, `schedule.constants.ts`,
`competition-day.model.ts`, `section.model.ts`, `section-item.model.ts`,
`section-item-type.ts` (enum + type), `performance-duration.ts`,
`calculate-schedule.ts`, `dto/` (`build-section.dto.ts`,
`reorder-section.dto.ts`, `move-exit.dto.ts`, `merge-groups.dto.ts`).

### 1. Days — `BE-T1`

- `GET  /competitions/:id/days` — lazy `findOrCreate` per date, ordered.
- `DELETE /days/:dayId` — `409` if the day has any section.

### 2. Pure duration — `BE-T2`

`performance-duration.ts` as specified above. No DB, no `class-validator`.

### 3. Pure schedule — `BE-T3`

`calculate-schedule.ts` as specified above.

**Готово, коли:**
- [ ] Три виступи по 60 с, пауза 20 с, старт 09:00 → 09:00, 09:01:20,
      09:02:40; нагородження 09:04.
- [ ] Improv-група з трьох по 30 с отримує паузу один раз.

### 4. Unassigned pool — `BE-T4`

`GET /competitions/:id/performances/unassigned?league=&ageCategory=&nominationId=`
— entries of the competition whose `id` is not in any `section_items`
row, filtered by the query params (all optional), ordered by `number`.

### 5. Build a section — `BE-T5`

`POST /competitions/:id/sections { dayId, venueId?, name, startTime, entryIds[] }`

- `409 { assigned: [{ entryId, number, sectionName }] }` if any `entryId`
  is already in a section.
- Group the given entries by `nomination`, order within a group by
  `number`; assign `nominationGroupKey = nominationId ?? nomination`.
- Append one `award` item.
- `sortOrder` sequential across the whole section; `name` defaults are a
  client concern (`Відділення N`).
- Response: the section with its items and **server-computed times**
  (`performanceDuration` per item → `calculateSchedule`).

### 6. Reorder / move / merge — `BE-T6`

- `PATCH /sections/:id/order { itemIds: string[] }` — must be the exact
  current set (`400` otherwise); `award` is moved back to last silently;
  re-persist `sortOrder`; respond with recomputed times.
- `POST /competitions/:id/schedule/move-exit { entryId, targetSectionId }`
  — detach the exit from its current section, append to the target
  before that section's `award` row.
- `POST /sections/:id/merge-groups { groupKeys: string[], label }` —
  set `mergedGroupLabel` on the matching items; **display only**.
- `DELETE /sections/:id/merge-groups/:groupKey` — clear the label.

### 7. Explicit recalculation — `BE-T7`

`POST /competitions/:id/schedule/recalculate { sectionId? }` — no data
changes; returns every affected section with freshly computed times.
Exists so the client has a single "apply the new pauses / limits" action
after `PATCH /rules`.

### 8. Program projections — `BE-T8`

- `GET /competitions/:id/program` — **no auth**. Service rows only:
  section start, nomination-block name + start time, award, break. No
  names, numbers or studios.
- `GET /competitions/:id/program/mine` — `JwtAuthGuard`. Service rows +
  the caller's own exits with `number`, `nomination`, time, and
  `isMine` / `isMyStudent` flags computed server-side.
- `GET /competitions/:id/program/extended` — `JwtAuthGuard` +
  `assertAccess`. Every position with `number`, participant names,
  studio, coach, `limitSeconds`, `effectiveDurationSeconds`, `hasTrack`
  (`= entry.musicName != null`). `403` for a coach who is not on the
  team.

**Готово, коли:**
- [ ] Публічна відповідь не містить жодного прізвища.
- [ ] `/mine` для учасника — рівно його виходи; для тренера — виходи
      його ростера.
- [ ] `/extended` для стороннього тренера → `403`.

### 9. Cancellation flag — `BE-T9`

When an entry that is referenced by a `section_item` is deleted
(existing `DELETE /competitions/:id/entries/:entryId`), null the item's
`entryId` (keep the row so `sortOrder` is stable) and add
`{ requiresScheduleRecalculation: true }` to the delete response.

## Frontend changes

### New libs

- `lib/schedule.ts` — days, sections, section items, unassigned pool,
  build / reorder / move / merge / recalculate. Types mirror the API.
- `lib/program.ts` — the three projections.
- `lib/competitionRules.ts` — `getRules`, `patchRules`, duration limits,
  overrun tariffs (the `competition_rules` API already exists, only the
  client is missing).
- `lib/duration.ts` — add `formatClock(seconds, withSeconds?)` →
  `ГГ:ХХ` / `ГГ:ХХ:СС` and `parseClock('09:30') → 34200`. Keep
  `parseDuration` / `formatDuration` for limit fields.

### `pages/CompetitionDetailPage.tsx`

Add `Правила` and `Програма` to `ALL_TABS`.

### `components/admin/RulesPanel.tsx` — `FE-T2`

Blocks: «Час і паузи», «Доплати за переліміт», «Фінанси», «Відбори».
`surchargesEnabled` toggle switches between the `timeSource` radios and
the tariffs table. `DurationLimits` table accepts `1:30` or `90`.
Warning under Save when the competition already has sections: «Зміна
пауз і лімітів не перерахує вже сформовані відділення автоматично.
Перерахувати можна на сторінці програми.» Partial `PATCH`, toast
«Правила збережено».

### `components/admin/SchedulePanel.tsx` (+ children) — `FE-T3` / `FE-T4`

- Day / venue switchers, hidden when singular.
- `UnassignedPool` — filters (age category, league) + counter
  «Нерозподілено: N» (`pluralExits`).
- «Обрати все» selects only what passed the filter; «Зняти вибір».
- `BuildSectionModal` — «Назва відділення» (prefilled `Відділення N`) +
  «Час початку» (`ГГ:ХХ`), both required → `POST /sections`.
- After build / every mutation: re-render sections with **server times**
  and the award row. `409` → conflict list + «Оновити пул». Empty pool →
  «Усі виходи розподілені по відділеннях».
- `SectionList` — native HTML5 drag-and-drop, no library. Drag a single
  row or a whole nomination group (by its header). Award row:
  `not-allowed`, tooltip «Нагородження завжди останнє». Each drop →
  `PATCH /sections/:id/order`, optimistic with rollback; `400` → toast
  «Розклад змінив хтось інший» + reload. «Перенести» via existing
  `KebabMenu`. `MergeGroupsModal` — 2+ groups + shared label + warning
  «Об'єднання діє лише в програмі цього конкурсу. Судять і рахують
  результати далі по вихідних категоріях.»; «Роз'єднати» on a merged
  header.
- «Перерахувати розклад» button → `POST /schedule/recalculate` behind a
  `ConfirmDialog` («Час виступів може зсунутися.») — `FE-T6`.

### `pages/SchedulePage.tsx` + route — `FE-T5`

`/competitions/:id/schedule`, **no auth** (add to `App.tsx` outside the
token-gated routes, like `/competitions/preview`). Columns: час, код
номінації, номер, ПІБ, студія, керівник. Section + group headers with
start time. `isMine` / `isMyStudent` highlighting from the server (calls
`/program/mine` when a token is present, `/program` otherwise). Top
panel «Ваші виступи: N» / «Ваші учні: N». Surname + number search
filters rows live. Day / venue switcher when plural. Mobile: rows become
cards, time large on the left.

**Готово, коли:**
- [ ] Час у відділенні приходить із сервера, клієнт його не рахує.
- [ ] Нагородження не перетягується.
- [ ] `400` на reorder відкочує порядок і перезавантажує.
- [ ] Неавторизований перегляд рендериться без панелі, з полем пошуку,
      читається на 360 px.

## Data flow — build and view

1. Organizer opens **Правила**, sets `pauseSeconds` / limits → `PATCH /rules`.
2. Opens **Програма**, filters the pool, «Обрати все» → «Сформувати
   відділення» (name + start time).
3. `POST /sections` groups by nomination, appends award, returns items
   with times from `performanceDuration` → `calculateSchedule`.
4. Drag / move / merge → each call returns the section with recomputed
   times; the client re-renders, never recalculates.
5. Later the organizer changes a pause → warning shown → «Перерахувати
   розклад» → `POST /schedule/recalculate` reflows the sections.
6. Public `/competitions/:id/schedule` reads `/program` (or `/program/mine`).

## Testing

Tests are written on request (per project convention). When asked, cover:

- `performanceDuration` — improv group, improv individual, non-improv
  (returns `limitSeconds`), `timeSource: 'track'` still returns
  `limitSeconds`.
- `calculateSchedule` — the two «Готово, коли» examples in BE-T3, award
  end time, improv-group single pause.
- Build `409`, reorder `400` on a mismatched set, award forced last.
- Projections: no names in `/program`, `403` on `/extended` for a
  non-team coach.

## Risks / notes

- `timeSource: 'track'` is inert until a future track-measurement task
  adds `durationSeconds`. The rules UI still shows the radio so the
  setting is not lost.
- Lazy day creation means a competition whose dates change later will
  grow new days on next read; existing days are never auto-deleted.
- Concurrent editing is handled only by the full-set check on reorder
  (`400` → reload). No locking, no per-row versioning.
- Merge groups touches only `mergedGroupLabel`; nothing in judging or
  results reads it.
- Promoting `assertAccess` to `CompetitionsService` changes one private
  method into a public one and updates `competition-rules` to call it —
  no behaviour change.

## Open questions

1. **Break rows.** The public projection lists «перерва» — do we need an
   explicit "break" `section_item` type the organizer inserts, or is a
   break just the gap between two sections' start times? (Leaning: gap
   only for v1, no break item.)
2. **Venue on a section vs. on a nomination.** `nominations` already
   carry `venueId`. Does a section inherit the venue from its
   nominations, or does the organizer pick it freely in
   `BuildSectionModal`? (Leaning: free pick, `venueId` optional.)
3. **`/program/mine` without a login** — a spectator parent has no
   account. Confirmed the surname/number **search** on the public page
   covers them and `/mine` is genuinely login-only?
4. **Recalculate scope** — is per-section enough, or do organizers want
   a single "recalculate the whole day" button? (Leaning: both — omit
   `sectionId` to do the day.)

## As built — deviations from the text above

All four open questions were taken at their leaning. Further changes made
during implementation:

1. **Durations are frozen, not recomputed on every read.** To honour
   decision 7 (no silent mid-festival reflow), the build/recalculate step
   writes `section_items.durationSeconds` and `sections.pauseSeconds`.
   `GET /sections` and the projections run only `calculateSchedule` over
   those frozen values, so a later `PATCH /rules` changes nothing until
   `POST /schedule/recalculate` is called. Data model gained those two
   columns; decision 6 now means "start times computed on read, durations
   and pause frozen at build/recalculate".
2. **`assertAccess` was not promoted to `CompetitionsService`.** That
   service's check lets any `ORGANIZER` edit any competition;
   `competition-rules` and the schedule want owner-or-team only. The
   ~12-line helper is replicated in `ScheduleService`, matching the
   pattern already in `EntriesService` and `CompetitionRulesService`.
3. **BE-T9 delivered structurally, without the response flag.**
   `section_items.entryId` is `ON DELETE SET NULL`; a cancelled exit
   drops out of the schedule view immediately (`isLiveItem`) and the
   dangling row is deleted on the next recalculate. `EntriesService` is
   untouched — no `{ requiresScheduleRecalculation: true }` on the delete
   response. The always-present "Перерахувати розклад" button covers the
   workflow.
4. **Public page search.** Per decision 8 the public projection carries
   no names, so an anonymous visitor cannot search for a dancer. The page
   shows the poster to everyone; a logged-in user additionally gets a
   "Ваша програма" block (own + roster exits) with a surname/number
   filter over that block. This narrows old FE-12's spectator search.
5. **Group-header drag not implemented.** Reordering is row-level
   (native HTML5 DnD) plus "Перенести" to another section via `KebabMenu`
   and merge/split of nomination groups. Dragging a whole group by its
   header is a follow-up.
6. **Endpoints are all nested under `competitions/:competitionId`**
   (e.g. `DELETE competitions/:id/days/:dayId`, not `DELETE /days/:dayId`)
   for consistency with the existing `competition-rules` controller.
7. **New frontend `lib/http.ts`** (`apiRequest` / `publicRequest` /
   `ApiError`) backs the three new lib modules instead of each copying the
   per-file `request` helper. Existing libs are left as they were.

Run `npm run migrate` in `backend/` to apply the three new migrations.

## As built — round 2 (aligned to `.claude/standalone.html`)

The reference design keeps timing rules inline on the program screen and
has explicit break / gala rows. Changes:

1. **No «Правила» tab.** `RulesPanel` is deleted. A compact
   `ScheduleSettings` block sits at the top of the «Програма» tab:
   technical pause + a per-league on-stage limit list, edited in place.
2. **`competition_rules.leagueLimits` (JSONB)** — `{ league name -> seconds }`,
   the simple knob the inline UI writes. Duration resolution for a
   non-improv exit is now: `leagueLimits[entry.league]` → per-nomination /
   per-axis `duration_limits` → 180s. `duration_limits` stays as the
   fine-grained override; its editor is not surfaced in this UI.
   Migration `20260904130000`.
3. **`break` and `gala` section-item types** + a `section_items.label`
   column (migration `20260904130100`). `POST /sections/:id/rows` and
   `DELETE /sections/:id/rows/:itemId` add/remove them; they run for their
   own `durationSeconds` and no pause follows them; `recalculate` leaves
   their manual duration alone. UI: `AddRowForm` in each `SectionList`.
4. **Технічна / Публічна toggle** on the panel — the editing view
   (`SectionList`s + pool) vs. a read-only `ProgramPoster` built from
   `GET /program`.
5. Reorder stays native drag-and-drop (design's `↑↓` / `⇤⇥` buttons not
   adopted). The «Музика та доплати за час» sub-tab from the design is
   still deferred (needs measured track durations).

## As built — round 3 (visual port of the design)

The `.claude/standalone.html` layout is now applied to the «Програма» tab.

1. **Two tabs.** «Таймінги» = pause + per-league limits, styled as the
   design's grey edit-panel (`ScheduleSettings`). «Програма» = the
   schedule editor.
2. **`PATCH /competitions/:id/sections/:sectionId`** (`updateSection`) —
   rename a section / change its start time inline. No migration.
3. **`SchedulePanel` rebuilt** (`program.module.css`, slate palette):
   venue / day pill row, `Технічна | Публічна` segmented toggle,
   `Редагувати / Готово` mode button, a dark edit-panel (add break/gala
   row, «Сформувати відділення», «Перерахувати розклад»), a stat-card
   counters row (виступів / орієнтовне завершення / без музики), search +
   «Без музики» chip + «Згорнути всі / Розгорнути».
4. **`ProgramTable`** — the whole program as one continuous table
   (`F / № / Прізвище / Тренер / Студія / Час [/ Тривалість / Переплати /
   actions]`). Each backend section renders as a blue «Початок
   відділення» row (start time editable in edit mode), its nomination
   blocks (collapsible, count, «обʼєднано» badge, block duration),
   performance rows, then «Нагородження»; break / gala are rows too.
   `↑↓` reorders within a section; section-level reorder still has no
   endpoint.
5. `SectionList` and `AddRowForm` removed, replaced by `ProgramTable`.
   `Schedule.module.css` still backs `UnassignedPool`, `BuildSectionModal`,
   `MergeGroupsModal`, `ProgramPoster`.
6. Still deferred: the «Переліміти» counter/chip and «Музика та доплати за
   час» — both need measured track durations.

## As built — round 4 (section reorder + remaining endpoints)

1. **`POST /competitions/:id/schedule/reorder-sections`**
   (`{ dayId, sectionIds }`) — order the «Початок відділення» rows of one
   day; `400` if the id set does not match the day. UI: `↑ ↓` on the
   section row in edit mode (`ProgramTable` → `onReorderSection`).
2. **`PATCH /competitions/:id/sections/:sectionId/rows/:itemId`**
   (`{ label?, durationSeconds? }`) — edit a break / gala row; manual
   rows only. UI: the row's minutes input in edit mode.
3. No new migration. Full schedule endpoint set is now: days
   (`GET`, `DELETE`); sections (`GET`, `POST` build, `PATCH`
   name/start-time, `DELETE`, `PATCH .../order` items,
   `POST schedule/reorder-sections`); rows (`POST`, `PATCH`, `DELETE`
   under `sections/:id/rows`); `schedule/move-exit`;
   `sections/:id/merge-groups` (`POST`, `DELETE .../:groupKey`);
   `schedule/recalculate`; `performances/unassigned`; `program`,
   `program/mine`, `program/extended`.
4. Per-performance duration override and the surcharge sub-panel stay
   out — they depend on measured track lengths.

## As built — round 5 (multi-day separation)

1. **`SectionView.dayDate` / `PublicProgramRow.dayDate`** — the section's
   calendar date is now threaded through so any consumer can label a day
   without calling `GET /days` (which is auth-only).
2. **«Програма» tab shows every day at once by default** on a multi-day
   festival: the day filter gains an «Усі дні» pill (the default), and
   `ProgramTable` renders a dark full-width day-header row before the
   first section of each day. Reorder (`↑↓`) and build still act within a
   single day — `BuildSectionModal` gained a day `<select>` when there is
   more than one day, and `reorder-sections` is scoped to the section's
   own `dayId`.
3. The public `/competitions/:id/schedule` page and the admin
   `ProgramPoster` preview both insert a day heading when `dayDate`
   changes across a multi-day program.
