# Improvisation flag lives on the style — design

Date: 2026-09-29
Branch base: `develop`
Status: draft — awaiting Developer's review

## Goal

Keep **one** source of truth for "this performance is an improvisation",
so an improvised exit always runs for the competition's improvisation
duration (Налаштування таймінгів → «Тривалість імпровізації»). That
duration wins over the lineup, league and manual limits.

Today the flag lives in several places that drift apart:

| where | what goes wrong |
|---|---|
| `nominations.allowsImprovisation` | per nomination, so it cannot mark one program inside a special nomination («Корона» = «Імпровізація межансе» + «Raks al Sharki»). The organizer also has to remember to set it. **Scheherazade** has 375 nominations with an «Імпровізація…» style but no flag, and all of them run with a track and the league duration. |
| `template_nominations.allowsImprovisation` | a copy of the above in templates |
| `entries.improv` | taken from the client DTO. `ApplyPage` always sends `false` for special rows, and admins can toggle it by hand in `EntryEditModal` |
| program name prefix `'імпровіз'` | `isImprovisationEntry`, `isImprovisationProgram`, `exitsAreAllImprovisation`, the `timedPrograms` filter in `SpecialCategoryModal` — a string heuristic |

Hard constraint: participants and organizers apply to and configure
nominations (including «Корона») exactly as they do now. Organizers get
no new step.

Non-goals: per-program limits (`nominations.programLimits`) are never
read by the schedule (`resolveEffectiveLimit`). That is a separate bug,
tracked apart from this change. Nothing changes in the schedule's
duration arithmetic itself.

## Decision

Improvisation is an intrinsic property of a **program/style** value.
«Імпровізація межансе» is an improvisation at every festival, for every
organizer. So the flag becomes a boolean on the style row of the shared
`categories` dictionary, and every other place **derives** from it.

This does not break the "no per-owner column on `categories`" rule. That
rule is about owner data (prices differ per organizer). This flag is the
same for everyone, like `rangeFrom/rangeTo` and `description`, which
already live on the shared row and are edited globally.

Data check (copy of production, 2026-09-29): every nomination with
`allowsImprovisation = true` has an «Імпровізація…» style, and none has
the flag without a style. The nomination flag carries no information the
style doesn't.

## Model

- **`categories.isImprovisation`**: `BOOLEAN NOT NULL DEFAULT false`.
  Meaningful only for `type = 'style'`. The service rejects it for any
  other type, following the pattern of `NOT_AGE_CATEGORY_MESSAGE`.
- **Removed:** `nominations.allowsImprovisation` and
  `template_nominations.allowsImprovisation`.
- **`entries.improv` stays**, as a **derived** copy written only by the
  server, the same way `section_items.durationSeconds` is a frozen copy.
  Schedule, tracks, music export and section views keep reading it
  unchanged.

### Derivation rule (one function, backend)

An exit is an improvisation when:

- `per_program` exit → its program's style has `isImprovisation`;
- single exit (regular nomination, or a special nomination in `single`
  mode) → the nomination has at least one style **and all** of its styles
  have `isImprovisation`.

A nomination is an improvisation (for the badge in admin lists and for
its auto duration) when all of its exits are.

This rule lives in `nomination-exits.ts`:
- `NominationProgram` gains `isImprovisation`;
- `planNominationExits` sets `NominationExit.isImprovisation`.

`programsFor` in `nominations.service.ts` fills the flag from the loaded
categories.

## Backend changes

1. **Migration** `add-is-improvisation-to-categories`:
   1. add `categories.isImprovisation`;
   2. set it to `true` for styles linked to a nomination with
      `allowsImprovisation = true`, **or** whose name starts with
      `імпровіз` (case-insensitive). The name is used once, here only.
   3. recompute `entries.improv` for every entry with a nomination by the
      derivation rule. A `per_program` entry matches its program by
      `entries.program = categories.name` within its nomination's styles,
      the same matching `exitMatchingProgram` already does.
   4. drop `nominations.allowsImprovisation` and
      `template_nominations.allowsImprovisation`.
   5. `down`: re-add both columns and backfill them from the styles.
2. **Categories module:**
   - `PATCH /categories/:id/improvisation`, `MinLevel(ADMIN)`, body
     `{ isImprovisation: boolean }`, shaped like `:id/description`;
   - the model, the returned DTO and the `CategoryType` guard.

   On a flip, the categories module calls a nominations-side method
   (below) to resync. Categories doesn't reach into entries itself.
3. **Nominations module:**
   - `toDto` exposes a derived `isImprovisation` (nomination) and
     `exits[].isImprovisation`;
   - `applyAutoDuration` and `autoDurationSeconds` use the derived flag
     instead of `input.allowsImprovisation`;
   - remove the bulk route (`PATCH bulk-improvisation`,
     `BulkSetImprovisationDto`, `bulkSetImprovisation`), the
     `allowsImprovisation` handling in `update`, and
     `syncEntriesImprovisation` (added 2026-09-29, now superseded);
   - new `resyncImprovisationForStyle(categoryId)`: for every nomination
     linked to that style, re-derive its auto duration
     (`reapplyAutoDurations`, reused) and `entries.improv` of its entries.
     Runs in one transaction.
   - `competition-rules.service.ts` `applyLeagueDurationChanges` filters
     `allowsImprovisation: false`. It switches to excluding nominations
     whose derived flag is true: a subquery over `nomination_categories`
     joined to improvisation styles.
4. **Entries module:**
   - `buildRow`: `improv = exit.isImprovisation`. `CreateEntryDto.improv`
     is removed.
   - `update` (staff edit): the manual `dto.improv` is removed. When the
     nomination changes, `improv` comes from the matched exit
     (`exitMatchingProgram`, already there).
5. **Tracks / music export:** `isImprovisationEntry` becomes
   `entry.improv`. Remove `IMPROVISATION_PROGRAM_NAME_STEM` from
   `tracks.constants.ts`.
6. **Templates:** `category-templates` service, DTO and model stop
   reading and writing `allowsImprovisation`. A template's nomination is
   an improvisation through its styles.

## Frontend changes

- **Style dictionary (admin):** an «Імпровізація» toggle next to
  `CategoryDescriptionEditor` in `NominationSetBuilder`, shown only to
  admins and only for styles. It calls a new
  `updateCategoryImprovisation` in `lib/categories.ts`.
- **Remove the per-nomination checkbox and bulk actions:**
  - `NominationSetBuilder` (checkbox);
  - `NewCompetitionPage` (checkbox and payloads);
  - `CategoryTemplateFormPage`, `templateNominations.ts`,
    `nominationSet.ts`, `categoryTemplates.ts`;
  - `NominationsPanel` (bulk buttons, `setImprovisationBulk`);
  - `SpecialCategoryModal` (`allowsImprovisation: false`).
- **Badges read the derived flag:** `NominationsPanel` and
  `CategoryTemplateDetailPage` read `nomination.isImprovisation`.
- **`ApplyPage`:** one row per nomination (no improv twin). `takesNoTrack`
  = every exit has `isImprovisation`. No `improv` in the submitted
  payload. `nominationRowKey` drops its `improv` argument.
- **`EntryEditModal`:** the improvisation checkbox becomes read-only
  (a label), since it is derived now.
- **Remove** `lib/improvisationProgram.ts` and `.constants.ts`. The
  `timedPrograms` filter in `SpecialCategoryModal` reads the style's
  `isImprovisation`.
- `lib/nominations.ts`, `lib/categories.ts`, `lib/entries.ts` types
  follow the API.

## Behaviour after the change

- Organizer creates «Корона» as today and picks «Імпровізація межансе»
  among its programs. The exit is an improvisation automatically: no
  track, improvisation duration. «Raks al Sharki» next to it keeps the
  league duration.
- Regular nomination «Бебі · Дебют · Імпровізація межансе» is an
  improvisation through its style, with no checkbox to forget.
- **Scheherazade:** its 375 «Імпровізація…» nominations become
  improvisations after the migration: no track requested, improvisation
  duration. This is the intended fix, not a side effect.
- A new improvisation style created by an organizer through
  `findOrCreate` starts unflagged until an admin flips it. It fails safe:
  it runs with the league duration and asks for a track. The admin sees
  the toggle in the dictionary.
- Durations already frozen in sections change only after «Перерахувати
  розклад», same as any timing change today.

## Risks

- **Resync matches by text.** Resync after a style flip matches
  `per_program` entries by program name within their nomination, because
  entries keep `program` as text. A style renamed after entries were
  filed won't match. This is accepted: the flag is set once and rarely
  flips. The honest fix is an `entries.programId` FK, which is out of
  scope.
- **The flag is global.** A style cannot be an improvisation at one
  festival and "with a track" at another. No such requirement exists
  today.
- **Removing bulk routes and DTO fields is an API break.** The e2e client
  `e2e/tests/retest/admin-api.client.ts` (`allowsImprovisation`) and the
  specs that use it must follow.

## Files touched (expected)

Backend: `categories/{category.model,categories.service,categories.controller,categories.constants}.ts`
and a new DTO; `nominations/{nomination.model,nominations.service,nominations.controller,nomination-exits}.ts`,
`nominations/dto/{create-nomination,bulk-set-improvisation}.dto.ts`;
`entries/{entries.service}.ts`, `entries/dto/create-entry.dto.ts` and the
update DTO; `tracks/{is-improvisation-entry,tracks.constants}.ts`;
`competition-rules/competition-rules.service.ts`;
`category-templates/{category-templates.service,template-nomination.model}.ts`,
`category-templates/dto/template-nomination.dto.ts`; one new migration.

Frontend: `lib/{categories,nominations,nominationSet,templateNominations,categoryTemplates,entries,nominationRowKey,improvisationProgram,improvisationProgram.constants}.ts`;
`components/nominations/{NominationSetBuilder,SpecialCategoryModal}.tsx`,
a new style improvisation toggle component;
`components/admin/{NominationsPanel,EntryEditModal}.tsx`;
`pages/{ApplyPage,NewCompetitionPage,CategoryTemplateFormPage,CategoryTemplateDetailPage}.tsx`.
