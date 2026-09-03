# Role access ladder + organizer approval — design

Date: 2026-09-03
Branch base: `develop` (builds on the uncommitted `access-level` refactor already present)
Status: awaiting review

## Goal

Finish the role/permission model for DanseFest:

- everyone picks **Учасник** or **Тренер** at registration; a coach is
  self-service, no approval
- becoming an **Організатор** requires an admin to approve a request
- a coach can name their own mentor coach; if that person is not in the
  system yet, a hidden placeholder account is created and later linked
  when the real person registers with the same phone
- an admin can raise or lower any user's level
- the first admin is seeded from environment variables

Non-goals: judges (commented out, untouched), phone OTP on claim, school
de-duplication, a dancer belonging to more than one coach's roster.

## Decisions (confirmed with Developer)

1. **Pure ladder.** `PARTICIPANT < COACH < ORGANIZER < ADMIN`. A higher
   level can do everything the levels below it can. `MinLevelGuard` +
   `@MinLevel()` stay as they are. We accept that an `ORGANIZER`
   implicitly "is a coach" (has a school, may keep a roster) and that
   revoking a role drops through the ladder.
2. **Registration chooses the role.** `role: 'PARTICIPANT' | 'COACH'` is
   required. A coach also sends `schoolId` (the UI creates the school
   first when it is new, exactly like the current `LevelUpgrade`). No
   post-registration "are you a trainer?" prompt.
3. **Only `→ ORGANIZER` needs admin approval.** `PARTICIPANT → COACH`
   stays self-service. Anyone (participant or coach) may submit an
   organizer request; the school is chosen or created inside the request
   form.
4. **Roster participant "номер" = phone number**, unique. Birth date is
   required when a coach creates a participant.
5. **Mentor coach placeholder** is a hidden `users` row keyed by phone
   (phone required). De-duplicated by phone. Linked + confirmed when the
   real person registers with that phone.
6. **Revocation:** the admin picks the target level explicitly
   (`setLevel` already does this). Dormant `schoolId` / `coachId` are
   left in place, reversible.
7. **First admin** is seeded from `ADMIN_EMAIL` + `ADMIN_PASSWORD` on
   boot.
8. **Mentor coach is set from the profile**, not the registration form.

## Architecture

Everything hangs off the single `users` table and the `AccessLevel`
ladder already introduced on `develop`. One new bounded context —
`organizer-requests` — mirrors the existing `competition-applications`
module (model / module / controller / service / dto / constants, no
functions passed as parameters).

```
Registration ──> users (role = PARTICIPANT | COACH)
                   │
   self-upgrade    ├─ PATCH /users/me/level      → COACH only
   mentor coach    ├─ PATCH /users/me/coach      → coachId (+ placeholder)
   roster          ├─ POST  /users/participants  → confirmed=false rows
                   │
Organizer request ─┴─> organizer_requests ──(admin PATCH)──> setLevel(ORGANIZER) + schoolId
```

## Data model

### `users` — new column

| column | type | notes |
|---|---|---|
| `confirmed` | `BOOLEAN NOT NULL DEFAULT true` | `false` = a stub with no real login behind it yet |

`confirmed = false` is written for:

- a roster participant created by a coach (`accessLevel = PARTICIPANT`,
  `passwordHash = null`, `coachId = <creator>`)
- a named-but-unregistered mentor coach (`accessLevel = COACH`,
  `passwordHash = null`, `schoolId = null`, `email = null`)

It flips to `true` on claim-complete **or** when the real person
registers with that phone (see "Registration over a stub").

Coach pickers return only `confirmed = true` rows. An organizer's
"all users" view is unaffected (still every row).

### `organizer_requests` — new table

| column | type | notes |
|---|---|---|
| `id` | UUID PK | |
| `userId` | UUID NOT NULL → `users` | `ON DELETE CASCADE` |
| `schoolId` | UUID NOT NULL → `schools` | `ON DELETE RESTRICT` |
| `note` | TEXT NULL | applicant's motivation |
| `status` | ENUM | reuse `ApplicationStatus` (`PENDING` / `APPROVED` / `REJECTED` / `CANCELLED`) |
| `reviewedByUserId` | UUID NULL → `users` | `ON DELETE SET NULL` |
| `reviewedAt` | DATE NULL | |
| `decisionNote` | TEXT NULL | admin's reason on reject |
| `createdAt` / `updatedAt` | DATE | |

Partial unique index: one `PENDING` request per user
(`CREATE UNIQUE INDEX ... ON organizer_requests ("userId") WHERE status = 'PENDING'`).

Reuse the **TypeScript** enum `ApplicationStatus`
(`competition-applications/application-status.enum.ts`) in the
`organizer-requests` model and DTOs — no new enum file. At the **DB**
level this still gets its own Postgres type
(`enum_organizer_requests_status`) with the same four values; the two
tables do not share a column type.

## Backend changes

### 1. `users` module

**`user.model.ts`** — add `confirmed` column.

**`users.service.ts`**

- `createRosterParticipant` sets `confirmed: false`.
- new `createPlaceholderCoach(data: PlaceholderCoachData): Promise<User>`
  where `PlaceholderCoachData = { firstName; lastName; phone }` (its own
  file in `users/`). De-dup: `const existing = await this.findByPhone(phone);
  if (existing) return existing;` otherwise create
  `{ accessLevel: COACH, confirmed: false, schoolId: null, coachId: null,
  email: null, passwordHash: null }`.
- new `setMentorCoach(userId: string, coachId: string): Promise<void>` —
  `updateFields(userId, { coachId })` after asserting the coach exists.
- new `listSelectableCoaches(): Promise<User[]>` —
  `where: { confirmed: true, accessLevel: { [Op.in]: [COACH, ORGANIZER, ADMIN] } }`,
  ordered by `lastName`.
- `selfUpgrade` — reject any `level` other than `COACH`
  (`BadRequestException` with a new constant
  `ONLY_COACH_SELF_UPGRADE_MESSAGE`). Keep the "only goes up" and school
  checks.

**`users.controller.ts`**

- `PATCH /users/me/level` — `UpgradeLevelDto.level` narrowed to
  `AccessLevel.COACH` (see DTO change).
- new `PATCH /users/me/coach` — `@MinLevel(COACH)`, body
  `SetMentorCoachDto` (below). Resolves to a `coachId` then calls
  `setMentorCoach`.
- new `GET /users/coaches` — `@MinLevel(COACH)`, returns
  `listSelectableCoaches()` mapped to `{ id, firstName, lastName,
  schoolName }` (reuse the school lookup already in `getFullProfile`; if
  N+1 matters, a single `include: [School]`).

**DTOs**

- `dto/upgrade-level.dto.ts` — `SELF_UPGRADABLE` → `[AccessLevel.COACH]`,
  `level` type → `AccessLevel.COACH`. `schoolId` stays optional-in-DTO,
  required-in-UI.
- new `dto/set-mentor-coach.dto.ts` — exactly one of:
  - `@IsOptional() @IsUUID() coachId?: string`
  - `@IsOptional() @ValidateNested() newCoach?: NewMentorCoachDto`
  with a class-level check that exactly one is present (a small
  validator constant message `MENTOR_COACH_ONE_OF_MESSAGE`).
- new `dto/new-mentor-coach.dto.ts` — `firstName`, `lastName` non-empty;
  `phone` non-empty (**required**).

**`access-level.enum.ts`** — `SELF_UPGRADABLE_LEVELS` → `[AccessLevel.COACH]`.

### 2. `auth` module

**`dto/register.dto.ts`**

- add `role: AccessLevel.PARTICIPANT | AccessLevel.COACH`,
  `@IsIn([PARTICIPANT, COACH])`, required.
- add `schoolId?: string` — `@IsOptional() @IsUUID()`. Service enforces
  "required when `role === COACH`" with a new constant
  `SCHOOL_REQUIRED_FOR_COACH_MESSAGE`.

**`auth.service.ts` — `register`**

New order of checks:

1. `const byEmail = await usersService.findByEmail(dto.email)` → if hit,
   `EMAIL_OR_PHONE_TAKEN` (unchanged).
2. `const byPhone = await usersService.findByPhone(dto.phone.trim())`.
   - hit **and** `byPhone.confirmed === true` → `EMAIL_OR_PHONE_TAKEN`.
   - hit **and** `byPhone.confirmed === false` → **claim the stub**:
     `usersService.linkRegistration(byPhone.id, { firstName, lastName,
     email, passwordHash, birthDate, accessLevel: max(byPhone.accessLevel,
     dto.role), schoolId: dto.role === COACH ? dto.schoolId : byPhone.schoolId,
     confirmed: true })`, keeping the row `id`. Then `issueSession`.
   - no hit → create as today, with `accessLevel: dto.role`,
     `schoolId: dto.role === COACH ? dto.schoolId : null`,
     `confirmed: true`.
3. When `role === COACH` and `schoolId` missing →
   `SCHOOL_REQUIRED_FOR_COACH_MESSAGE` (before any DB write).

`max(a, b)` = the higher-ranked level, using `isHigherLevel` from
`access-level.enum.ts`.

**`users.service.ts` — new `linkRegistration(userId, fields)`** — a
single `userModel.update(fields, { where: { id: userId } })` returning
the reloaded row. Keeps the merge logic in one place.

**`auth.service.ts` — `completeClaim`** — when it sets the first
password, also set `confirmed: true` (extend `setPassword` to
`claimAccount(userId, passwordHash)` or pass a second update; prefer a
dedicated `usersService.claimAccount`).

### 3. `organizer-requests` module (new)

Files: `organizer-request.model.ts`, `organizer-requests.module.ts`,
`organizer-requests.controller.ts`, `organizer-requests.service.ts`,
`organizer-requests.constants.ts`,
`dto/create-organizer-request.dto.ts`,
`dto/review-organizer-request.dto.ts`.

**Endpoints**

| verb + path | guard | body | effect |
|---|---|---|---|
| `POST /organizer-requests` | `@MinLevel(PARTICIPANT)` | `{ schoolId, note? }` | reject if caller `>= ORGANIZER` (`ALREADY_ORGANIZER_MESSAGE`) or has a `PENDING` (`REQUEST_ALREADY_PENDING_MESSAGE`); assert school exists; create `PENDING` |
| `GET /organizer-requests/me` | `@MinLevel(PARTICIPANT)` | — | caller's requests, newest first |
| `GET /organizer-requests` | `@MinLevel(ADMIN)` | `?status=` | all, optionally filtered |
| `PATCH /organizer-requests/:id` | `@MinLevel(ADMIN)` | `{ status: APPROVED \| REJECTED, decisionNote? }` | set status + `reviewedByUserId` + `reviewedAt`; on `APPROVED` → `usersService.setLevel(userId, ORGANIZER)` **and** `usersService.updateFields(userId, { schoolId })` |
| `PATCH /organizer-requests/:id/cancel` | `@MinLevel(PARTICIPANT)` | — | owner only, `PENDING` → `CANCELLED` |

**`review-organizer-request.dto.ts`** — `status` `@IsIn([APPROVED, REJECTED])`,
`decisionNote?` optional string.

Module imports `UsersModule` (already exports `UsersService`) and
registers `OrganizerRequest` with Sequelize. Add to `app.module.ts`.

### 4. First-admin seed

New `app-bootstrap/` with `app-bootstrap.service.ts`
(`implements OnModuleInit`) and `app-bootstrap.constants.ts`
(`ADMIN_EMAIL_ENV = 'ADMIN_EMAIL'`, `ADMIN_PASSWORD_ENV = 'ADMIN_PASSWORD'`).

`onModuleInit`: read both env vars via `ConfigService`; if either is
missing, return. If `usersService.findByEmail(email)` hits, return.
Otherwise `usersService.create({ firstName: 'Адмін', lastName: 'DanseFest',
email, phone: 'admin:' + randomUUID(), passwordHash: await bcrypt.hash(...),
birthDate: null, accessLevel: ADMIN, confirmed: true, schoolId: null,
coachId: null })`.

Registered in `app.module.ts` providers. No migration (env-dependent).

### 5. Migrations

Both must run **after** `20260902120000-unify-accounts-into-users` and
`20260902140000-access-level-ladder`.

1. `add-confirmed-to-users`
   - `addColumn('users', 'confirmed', { BOOLEAN, NOT NULL, default true })`
   - backfill: `UPDATE users SET confirmed = false WHERE "passwordHash" IS NULL`
   - `down`: `removeColumn`
2. `create-organizer-requests`
   - `createTable` per the schema above (reuse
     `enum_competition_applications_status` values; a fresh
     `enum_organizer_requests_status` type is fine)
   - partial unique index on `("userId") WHERE status = 'PENDING'`
   - `down`: `dropTable` + `DROP TYPE`

## Frontend changes

### `lib/roles.ts`
- `SELF_UPGRADABLE_LEVELS` → `[ACCESS_LEVEL.COACH]`.

### `lib/auth.ts`
- `register()` payload gains `role` and (for a coach) `schoolId`.
- `upgradeLevel()` only ever sends `COACH`.
- new `getSelectableCoaches()`, `setMentorCoach(body)`.

### new `lib/organizerRequests.ts`
- `createOrganizerRequest({ schoolId, note? })`
- `getMyOrganizerRequests()`
- (admin) `listOrganizerRequests(status?)`, `reviewOrganizerRequest(id, body)`
- same `authorizedFetch` + error-wrapper pattern as `lib/entries.ts`.

### `pages/RegisterPage.tsx`
- role toggle **Учасник / Тренер**.
- when **Тренер**: show the school select + "create new" input (lift the
  block out of `LevelUpgrade` into a shared `SchoolPicker` component so
  it is not duplicated), send `role: 'COACH'`, `schoolId`.

### `components/LevelUpgrade.tsx`
- remove the "Стати організатором" button.
- keep "Стати тренером" (now the only self-upgrade); reuse `SchoolPicker`.
- add "Подати заявку на організатора" → opens the organizer-request form
  (`SchoolPicker` + note textarea) → `createOrganizerRequest`; show the
  latest request's status if one exists.

### new `components/MentorCoachField.tsx` (profile)
- pick from `getSelectableCoaches()` **or** enter
  `{ firstName, lastName, phone }`; `phone` required.
- calls `setMentorCoach`; shown on `ProfilePage` for `COACH`+.

### new admin screen `pages/OrganizerRequestsPage.tsx`
- `@MinLevel(ADMIN)` route; table of requests with Approve / Reject
  (reject asks for `decisionNote`).

### `pages/ProfilePage.tsx`
- render `MentorCoachField` for `COACH`+; add the admin link when `ADMIN`.

## Data flow — organizer request

```
participant/coach ──POST /organizer-requests { schoolId, note }
   service: caller < ORGANIZER? no PENDING? school exists? → create PENDING
admin ──GET /organizer-requests?status=PENDING
admin ──PATCH /organizer-requests/:id { status: APPROVED }
   service: status=APPROVED, reviewedBy=admin.id, reviewedAt=now
            usersService.setLevel(userId, ORGANIZER)
            usersService.updateFields(userId, { schoolId })
   next login / token refresh → JWT carries accessLevel = ORGANIZER
```

Note: an already-issued access token keeps the old level until it
expires or is refreshed. Acceptable (same as every other level change
today).

## Data flow — registration over a stub

```
real coach ──POST /auth/register { phone: X, role: COACH, schoolId, ... }
   byEmail? no.  byPhone? yes, row S with confirmed=false (a placeholder
                 someone named as their mentor).
   linkRegistration(S.id, { passwordHash, email, birthDate, firstName,
       lastName, accessLevel = max(S.accessLevel, COACH), schoolId,
       confirmed: true })
   → S.id unchanged, every users.coachId pointing at S stays valid
   issueSession(S)
```

## Testing

Only if Developer asks. If so, the highest-value units:

- `AuthService.register`: no-hit / confirmed-hit / stub-hit branches;
  `role = COACH` without `schoolId`.
- `UsersService.createPlaceholderCoach`: de-dup by phone.
- `UsersService.selfUpgrade`: rejects non-`COACH`.
- `OrganizerRequestsService`: duplicate `PENDING` rejected; `APPROVED`
  sets level + school.

## Risks / notes

- **`register()` stub-claim branch is the delicate part.** Keep the row
  `id`; the value being transferred is the `coachId` links, which is
  exactly the point of a claim. Someone registering with a stranger's
  phone that happens to be a stub would "claim" it — the same exposure
  the existing roster claim-by-phone already has, and the stub only
  holds data its creator typed. Documented, not mitigated further now.
- Lowering a user below `COACH` leaves `schoolId` / `coachId` dormant in
  the row. Reversible; no cleanup.
- The 5-table merge migrations already on `develop` must be run against a
  copy first; they wipe `refresh_tokens` (everyone re-logs in).
- School names are free text — duplicates ("Школа танцю" vs "школа
  танцю") are accepted.
- One dancer = one coach's roster, because `users.phone` is unique.
  Accepted.
- `SchoolPicker` is shared by three call sites — must not re-introduce
  the inline duplication it replaces.

## Open questions

1. Should `PATCH /organizer-requests/:id` with `REJECTED` allow the user
   to re-apply immediately, or gate re-application for some period? (This
   design allows immediate re-apply.)
2. When a stub coach is claimed via registration, do we overwrite
   `firstName` / `lastName` with the registrant's input (this design) or
   keep whatever the naming coach typed? Overwriting assumes the person
   themselves is the better source.
