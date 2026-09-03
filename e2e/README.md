# DanceFest E2E (Playwright)

E2E suite built from the live-testing inventory in `.claude/qa-test.md`. Drives the
real app in a browser — no mocking of frontend or backend.

## Prerequisites

The app must already be running (this suite does not start it):

```
docker compose up -d
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000

If you've just pulled new frontend changes and a test seems to see stale UI, restart
the frontend container so its dev server picks up the current source:

```
docker compose restart frontend
```

(This was needed once already — see `tests/known-bugs/bug-1-anonymous-competition-access.spec.ts`.)

**Seed the Admin account once per fresh database.** `admin/`, `category-templates/admin-creates-template.spec.ts`,
and `wizard/` all log in as the seeded Admin (`backend/seeders/20260822090000-mock-admin.ts`),
which the app's normal boot (`npm run migrate`) does **not** create — it needs an explicit
seed run:

```
docker exec dansefest-backend npm run seed
```

A fresh `docker compose up -d` on an empty volume needs this once before those specs will
log in successfully (they'll otherwise fail on the first `POST /auth/login` with a generic
401, same as any wrong password). Re-running `npm run seed` on a database that already has
the seed rows is a no-op for the admin row (`bulkInsert` — a second run will error on the
duplicate id, not silently skip it, so only run it when the row is actually missing).

## Install & run

```
cd e2e
npm install
npx playwright install chromium
npm test
```

`npm run test:ui` opens Playwright's UI mode; `npm run test:headed` runs with a
visible browser; `npm run report` opens the last HTML report.

## Structure

- `src/constants` — routes, roles, UI copy, test data. No magic strings in specs.
- `src/types` — `Role`, `TestAccount`.
- `src/pages` — one Page Object class per app page/route.
- `src/api` — thin REST clients (`category-templates-api.client.ts`,
  `competitions-api.client.ts`) used only where a spec needs to probe a raw HTTP
  status/response, or to seed data faster than driving the full UI flow that already
  has its own dedicated coverage (e.g. `wizard/`).
- `src/utils/test-account.factory.ts` — generates collision-free test accounts
  (unique email per run) so the suite can run repeatedly against the same, persistent
  dev database.
- `src/utils/organizer-competition.factory.ts` — registers a fresh Organizer via the
  UI and seeds one competition for it via the API, for specs whose subject is a
  downstream page (Team, Edit, Apply, detail tabs) rather than the creation wizard
  itself.
- `src/fixtures/test.fixture.ts` — extends Playwright's `test` with a page object per
  fixture; specs never construct page objects by hand.
- `tests/known-bugs/` — one spec per bug found either from the original `qa-test.md`
  inventory or live during later e2e work, asserting the *correct* behavior. Bugs
  still open use `test.fail()`, so they show red until fixed and flip to an
  "unexpected pass" failure the moment they're fixed — that's the cue to remove
  `test.fail()` and let the test go green for real.
- `tests/admin/`, `tests/apply/`, `tests/competition-detail/`, `tests/edit/`,
  `tests/team/`, `tests/wizard/` — coverage added 2026-09-03 for pages that had none
  yet (see "Out of scope" below for what's now covered vs. still not).

## Test data isolation & cleanup

- Every test that needs an account calls `TestAccountFactory.create(role)`, which
  mints a unique email + phone (timestamp + a monotonic counter) — no test reads or
  depends on another test's account, and tests don't depend on execution order.
- The backend exposes no delete endpoint for accounts (or the schools coaches create
  inline), so those test accounts are **not** deleted after a run — there is no API to
  do it with. This is a real limitation, not an oversight; it's why account emails are
  namespaced `e2e.<role>.<unique>@example.com`, so they're easy to recognize and bulk-
  clean from the dev database directly if it ever needs tidying.
- **Never assert "zero X exist globally"** (e.g. "no competition has open
  registration", "the templates list is empty") — this is a shared, persistent
  database and other specs in this suite (`wizard/`, `apply/`, `team/`, `edit/`,
  `competition-detail/`) create real competitions/templates that outlive their own
  test. `cabinets/participant-cabinet.spec.ts` and `cabinets/coach-cabinet.spec.ts`
  originally asserted exactly this and started failing once `OrganizerCompetitionFactory`
  existed — fixed by asserting a specific, uniquely-named competition instead of a
  global empty state. Scope every assertion to data the test itself created.
- `tests/known-bugs/bug-2-category-template-creation.spec.ts` *is* fully self-cleaning:
  it captures the created template's id from the `POST /category-templates` response
  and deletes it via `DELETE /category-templates/:id` (`src/api/category-templates-api.client.ts`)
  in a `finally` block. Right now creation itself 500s (that's the bug under test), so
  there's nothing to delete yet — but the moment BUG-2 is fixed, this test starts
  creating and immediately removing its own template on every run.

## Known-bug status

| Bug | Spec | Status |
|---|---|---|
| BUG-1 — anonymous competition access redirected to `/login` | `known-bugs/bug-1-anonymous-competition-access.spec.ts` | **Fixed** — asserted as a plain (non-`test.fail()`) regression test |
| BUG-3 — `/dashboard` has no role check | `known-bugs/bug-3-dashboard-role-guard.spec.ts` | **Fixed** (2026-09-02) — asserted as a plain (non-`test.fail()`) regression test |
| BUG-4 — dashboard competition list not scoped to the owner | `known-bugs/bug-4-dashboard-ownership-scope.spec.ts` | Still broken — `test.fail()` |
| BUG-5 — `payment_details.adminId` has a hard FK to `admins`, so `PUT /competitions/:id/payment-details` 500s for any Organizer-owned competition | `known-bugs/bug-5-organizer-payment-details-fk.spec.ts` | **Found live 2026-09-03.** Still broken — `test.fail()`. Blocks step 3 ("Оплата") of the wizard end-to-end for every self-registered Organizer; see the spec's doc comment for the root cause (same class of issue as BUG-2, fixed differently there) |
| BUG-6 — Судді/Майданчики/Заявки-style tabs (now just Майданчики/Заявки — Судді was removed with the Judge role) render a blank panel, not an error, when the backend 403s a non-owner | `known-bugs/bug-6-non-owner-tabs-silent-403.spec.ts` | Re-confirmed live 2026-09-03 against the current backend — the historical BUG-2 pattern from `qa-test.md` is still present. Still broken — `test.fail()` |

**BUG-2 was reclassified, not fixed as originally stated** — `POST /category-templates` →
500 for an Organizer. `qa-test.md` read this as "an Organizer should be able to create a
template"; it was briefly fixed that way (relaxing `authorId`'s FK to polymorphic, same as
`competitions.ownerId`). Developer then clarified the actual rule is the opposite: only an
Admin may author a template. That schema change was reverted, and an explicit `@Roles(Role.ADMIN)`
was added to create/update/fork/delete instead (`category-templates.controller.ts`) — an
Organizer now gets a clean 403, not a 500. See `tests/category-templates/organizer-cannot-author.spec.ts`
(moved out of `known-bugs/`, since this is confirmed-intentional behavior, not a bug).

## Covered as of 2026-09-03 (previously listed here as out of scope)

- **Apply page** (`tests/apply/apply-page.spec.ts`): `ApplyPage.tsx` itself has no
  auth gate — an anonymous visitor can open the form — but `POST .../entries` now
  requires a logged-in account (`entries.controller.ts` says so explicitly), so
  `authorizedFetch`'s own 401-handling bounces an anonymous *submit* to `/login`.
  That's the current, intentional behavior; a logged-in Participant's submission is
  covered too, along with the no-competition-id and no-nominations-yet states.
- **The wizard** (`tests/wizard/create-competition.spec.ts`): now that
  `tests/category-templates/admin-creates-template.spec.ts` shows the Admin-authors-
  templates flow works, the wizard is run as the seeded Admin end-to-end through all
  7 steps. Not run as an Organizer — see BUG-5 above; that's the actual blocker now,
  not "no template available".
- **Admin role**: still no self-registration path (by design — `POST /auth/register`
  refuses `role: ADMIN`), but the seeded Admin (`backend/seeders/20260822090000-mock-admin.ts`)
  gives every spec that needs one a way in (see the "Seed the Admin account" note
  above). `tests/admin/admins-page.spec.ts` covers `POST /admins` end-to-end
  (creating another Admin, the password-length check, and the role/logged-out
  guards on the page itself).
- **Competition detail tabs, edit, and team** (`tests/competition-detail/`,
  `tests/edit/`, `tests/team/`): all now exercised as the owning Organizer, seeded
  via `OrganizerCompetitionFactory` rather than re-driving the wizard each time.

## Still out of scope

- Judge role — removed from the product entirely (2026-09-02): no judge
  accounts, cabinet, or per-entry scoring by judges. Nothing to test.
- Banner image upload (wizard step 1, edit page) — the dropzone/file input is
  present but not exercised; it round-trips through S3 (`lib/uploads.ts`), which
  this suite has no fixture image or bucket assertion for yet.
- Judges/co-admin **invitation email delivery** itself — this dev environment has no
  `GMAIL_USER`/`GMAIL_APP_PASSWORD` configured, so any invite sent by
  `tests/team/team-page.spec.ts` is real but its email is silently never delivered;
  only the app's own behavior when email is unavailable is testable here.
- Fine-grained `NominationsPanel`/`EntriesPanel` behavior beyond the smoke coverage
  in `competition-detail.spec.ts`: special-category nominations, duration-limit
  editing, entries search/filter/sort/pagination, and score display.
