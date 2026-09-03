# Apply page redesign — design

Date: 2026-09-02
Branch base: `fe-main-page`
Status: awaiting review

## Goal

Rebuild the competition application form (`ApplyPage`) to match the
`standalone.html` mockup, and make it fully functional end to end:

- participant picker + inline "create participant"
- league selector (narrows the visible nominations)
- multi-select styles → nominations, one submission per nomination
- improvisation shown as a **row in the nomination list**, not a separate
  checkbox / separate entity
- special nominations pulled in and selectable
- studio / coach shown read-only, city, payment method, summed total,
  music filename, success screen

Scope is **`ApplyPage` only**. No other frontend page changes in this
pass. Backend changes are whatever makes the above work; the existing
`entries` module stays the single source the judge side reads from.

## Assumptions (confirmed with Developer)

1. Match the mockup design exactly for the form; backend shape is our
   call as long as it works.
2. Full participant flow on the form (picker + inline create).
3. "Improvisation as one of the categories" = a selectable **row** in the
   nomination list; the standalone checkbox is removed. `Entry.improv`
   still records it per entry.
4. League selection = a **client-side filter** over the nomination list.
   The league stored on the entry keeps being derived server-side from
   the chosen nomination. No `leagueId` on the entry, no league
   validation endpoint.
5. Inline "create participant" collects only first name / last name /
   phone / birth date (mockup). Email + password become **optional** for
   coach-created roster participants.
6. Music: the mockup only captures the file name for display. Current
   `ApplyPage` does not upload audio either. Keep that — capture the name
   for display, send nothing. Audio upload is out of scope.

## Architecture

Build on the existing `entries` module. `competition-applications` is
left untouched.

```
ApplyPage (rebuilt)
  ├─ getCompetition(id)                         (existing, public)
  ├─ getNominations(id)                         (existing, public — DTO extended)
  ├─ listParticipants()  ── new lib/participants.ts
  │      GET /users/participants                (existing, COACH/ORGANIZER)
  ├─ createParticipant() ── new lib/participants.ts
  │      POST /users/participants               (existing, DTO relaxed)
  └─ createEntry(id, {...}) once per selected nomination
         POST /competitions/:id/entries         (existing — DTO + service extended)
```

Session role decides the participant UI:

- `COACH` — picker lists the coach's participants + inline create.
- `PARTICIPANT` — no picker; the form applies for the logged-in
  participant (id from session profile).
- Any other logged-in role or no session — redirect to `/login`
  (matches today's behaviour).

## Backend changes

### 1. `Nomination` public DTO — expose axis names for filtering

`NominationsService.toDto` already resolves the linked `style` categories
into `programs`. Add the other two axes so the client can filter and
label without an auth-only categories call:

```ts
// toDto additions
leagues: this.categoriesFor(n, categories, 'level').map(c => c.name),
ageCategories: this.categoriesFor(n, categories, 'age').map(c => c.name),
```

Frontend `Nomination` type gains `leagues: string[]` and
`ageCategories: string[]`. No new endpoint. `isSpecial` and
`allowsImprovisation` are already in the DTO.

Competition-wide league option list = the union of `n.leagues` across all
returned nominations, in first-seen order (mirrors the mockup's
`applyLeagueOptions`).

### 2. `Entry.participantId` — new nullable FK

- Migration `add-participant-to-entries`: `participantId UUID NULL
  REFERENCES participants(id) ON DELETE SET NULL`.
- `Entry` model: `@ForeignKey(() => Participant)` column +
  `@BelongsTo`.
- `CreateEntryDto`: `@IsOptional() @IsUUID('4') participantId?: string`.
  `routineName` becomes optional in the DTO (server fills it from the
  participant when omitted); the column stays `NOT NULL`.
- `toDto` returns `participantId`.

### 3. `EntriesService.create` — resolve submitter, derive fields

- `EntriesController.create` gains `@CurrentUser() user` and passes it
  through. Keep `JwtAuthGuard`.
- New logic in `create(competitionId, dto, user)`:
  - If `dto.participantId` is set:
    - load participant (`ParticipantsService.findByIdOrFail`).
    - if `user.role === COACH`, assert `participant.coachId === user.id`
      (`ForbiddenException` otherwise).
    - derive when the DTO leaves them blank:
      `routineName` = `"<lastName> <firstName>"`,
      `studioName` = coach's school name (`coach.school.name`) if a
      coach is linked, else untouched,
      `choreographer` = coach's `"<firstName> <lastName>"` if linked.
  - If `user.role === PARTICIPANT` and no `dto.participantId`, use
    `user.id` as the participant id and derive the same way (no coach
    ownership check).
  - `league` / `ageCategory` still come from
    `nominationsService.resolveForEntry` — unchanged.
- `EntriesModule` already imports `NominationsService`; add
  `ParticipantsModule` (exports `ParticipantsService`) and
  `CoachesModule` (for the school name) to its imports. Verify those
  modules export their services; add `exports` if missing.

### 4. Relax `CreateParticipantDto` + `Participant`

- Migration `relax-participant-email-password`:
  `email DROP NOT NULL`, drop its unique index; `passwordHash DROP NOT
  NULL`. `phone` stays `NOT NULL UNIQUE`.
- `Participant` model: `email: string | null` (`allowNull: true`,
  remove `unique`), `passwordHash: string | null` (`allowNull: true`).
- `CreateParticipantDto`: `email` → `@IsOptional() @IsEmail()`;
  `password` → `@IsOptional() @MinLength(MIN_PASSWORD_LENGTH)`.
- `ParticipantsController.create`: only hash when `dto.password` is
  present; pass `passwordHash: null` otherwise. Pass `email: dto.email
  ?? null`.
- `ParticipantsService.create` /
  `assertEmailAndPhoneAvailable`: skip the email checks when email is
  null; keep the phone-uniqueness path. `existsByEmailOrPhone` callers
  that pass an empty email must not match null rows.
- `ParticipantSummary` / model reads: `email: string | null`.

No change to `competition-applications`, `auth`, or participant login —
a roster participant simply has no credentials until one is set.

## Frontend changes (`ApplyPage` + one new lib)

### `lib/participants.ts` (new)

```ts
export interface Participant {
  id; firstName; lastName; phone; email: string | null;
  birthDate; coachId: string | null;
}
export interface NewParticipant {
  firstName; lastName; phone; birthDate;
}
listParticipants(): Promise<Participant[]>          // GET /users/participants
createParticipant(p: NewParticipant): Promise<Participant>  // POST /users/participants
```

Uses `authorizedFetch` + the same error-wrapper pattern as
`lib/entries.ts`.

### `lib/nominations.ts`

Add `leagues: string[]` and `ageCategories: string[]` to `Nomination`.

### `lib/entries.ts`

`EntryInput` gains `participantId?: string`; `routineName` becomes
optional. `Entry` gains `participantId: string | null`.

### `ApplyPage.tsx` — rebuilt to the mockup

State: `participantId`, `showNewParticipant` + new-participant draft,
`league`, `selectedStyles: string[]`, `selection: { nominationId, improv
}[]`, `city`, `payMethod`, `musicName`, `submitError`, `submitting`,
`createdCount` (success).

Data load: `getCompetition`, `getNominations`, and — for a `COACH`
session — `listParticipants`.

Derived:

- `leagueOptions` — union of `nominations[].leagues`, first-seen order.
- `styleOptions` — union of `programs[].name` over **non-special**
  nominations (not filtered by league, matching the mockup's chips).
- `styleNominations` — non-special nominations whose `programs` intersect
  `selectedStyles` and (if a league is chosen) whose `leagues` include
  it. Each yields one plain row; nominations with
  `allowsImprovisation` yield an **extra** row
  `"<name> · Імпровізація"` carrying `improv: true`.
- `specialNominations` — `nominations.filter(n => n.isSpecial)`, always
  shown in their own section, each one selectable, league/style filter
  does not hide them.
- `selectedAge` — computed from the picked participant's `birthDate`
  against `nomination.ageCategories` (reuse `lib/ageRange`), shown
  read-only like the mockup.
- `studioLabel` / `coachLabel` — from the session profile (coach) or the
  picked participant's coach; read-only.
- `total` — sum of the selected nominations' `price` (improv row shares
  its parent nomination's price).
- `submitLabel` — `"Надіслати N заявки"` / `"Надіслати заявку"`.

Submit: guard participant + league + at least one selection, then
`Promise.all` a `createEntry` per `selection` entry with
`{ participantId, nominationId, improv, city, participantsCount?,
paymentMethod }`. On success show the mockup's success panel
("Заявку надіслано!" + "До моїх заявок" / "Подати ще одну заявку").
"До моїх заявок" → `/my-entries`.

Markup + inline styles copied from the mockup's `isApply` block:
560px white card, uppercase blue eyebrow, grid gap 14px, pill style
buttons, bordered nomination list with checkbox squares, 2-col rows for
studio/coach, payment toggle + total, file input, full-width submit.
Ported into `ApplyPage.module.css` rather than left inline.

### Removed

- The standalone "Імпровізація" `<label className={styles.check}>` and
  `handleImprovChange` / `musicInputRef` gating.
- The single `<select>` nomination picker and `NominationExits`
  helper's role as the only nomination UI (exits text can stay as a
  per-row hint or be dropped — see Open question 2).
- `title` / routine-name input (the entry name now comes from the
  participant).

## Data flow — submit

```
form (coach picks participant P, league L, styles, N nomination rows)
  └─ for each selected {nominationId, improv}:
       POST /competitions/:id/entries
         { participantId: P, nominationId, improv, city, paymentMethod }
       server:
         resolveForEntry(nominationId) → league, ageCategory, exits
         load P, assert coach owns P
         routineName = "Last First", studioName = school, choreographer = coach
         bulkCreate one Entry per stage exit
  responses flattened → createdCount = total entries
```

## Testing

Only if Developer asks. If so: `EntriesService.create` submitter
resolution + derivation (coach owns / does not own participant;
participant self-apply), and the participant-DTO relaxation
(create with no email/password).

## Risks / notes

- Making `participants.email` nullable drops its unique index — any code
  assuming email uniqueness for participants must be checked (auth
  lookup `findByEmail` returns first match; fine for null-less rows).
- `EntriesModule` importing `CoachesModule`/`ParticipantsModule` must not
  create a circular module import. If it does, fetch the school name
  through a lighter query instead of `CoachesService`.
- `POST /entries` currently takes no `@CurrentUser`; adding it must not
  break existing callers/e2e that already send a bearer token.

## Open questions

1. When a coach-created roster participant later needs to log in, who
   sets their password? Out of scope here; noted for a later pass.
2. Keep the per-nomination stage-exit / duration hint (`NominationExits`)
   as a small line under each row, or drop it for the mockup's cleaner
   list? Mockup has no such hint.
