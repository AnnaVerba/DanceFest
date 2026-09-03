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
- `src/utils/test-account.factory.ts` — generates collision-free test accounts
  (unique email per run) so the suite can run repeatedly against the same, persistent
  dev database.
- `src/fixtures/test.fixture.ts` — extends Playwright's `test` with a page object per
  fixture; specs never construct page objects by hand.
- `tests/known-bugs/` — one spec per bug from `qa-test.md`, asserting the *correct*
  behavior. Bugs still open use `test.fail()`, so they show red until fixed and flip
  to an "unexpected pass" failure the moment they're fixed — that's the cue to remove
  `test.fail()` and let the test go green for real.

## Test data isolation & cleanup

- Every test that needs an account calls `TestAccountFactory.create(role)`, which
  mints a unique email + phone (timestamp + a monotonic counter) — no test reads or
  depends on another test's account, and tests don't depend on execution order.
- The backend exposes no delete endpoint for accounts (or the schools coaches create
  inline), so those test accounts are **not** deleted after a run — there is no API to
  do it with. This is a real limitation, not an oversight; it's why account emails are
  namespaced `e2e.<role>.<unique>@example.com`, so they're easy to recognize and bulk-
  clean from the dev database directly if it ever needs tidying.
- `tests/known-bugs/bug-2-category-template-creation.spec.ts` *is* fully self-cleaning:
  it captures the created template's id from the `POST /category-templates` response
  and deletes it via `DELETE /category-templates/:id` (`src/api/category-templates-api.client.ts`)
  in a `finally` block. Right now creation itself 500s (that's the bug under test), so
  there's nothing to delete yet — but the moment BUG-2 is fixed, this test starts
  creating and immediately removing its own template on every run.

## Known-bug status (verified live 2026-09-02, after restarting the frontend container)

| Bug | Spec | Status |
|---|---|---|
| BUG-1 — anonymous competition access redirected to `/login` | `known-bugs/bug-1-anonymous-competition-access.spec.ts` | **Fixed** — asserted as a plain (non-`test.fail()`) regression test |
| BUG-2 — `POST /category-templates` → 500 | `known-bugs/bug-2-category-template-creation.spec.ts` | Still broken — `test.fail()`. Root cause seen in backend logs: the `category_templates_authorId_fkey` foreign key still points at `admins`, violated whenever the author is an Organizer |
| BUG-3 — `/dashboard` has no role check | `known-bugs/bug-3-dashboard-role-guard.spec.ts` | Still broken — `test.fail()` |
| BUG-4 — dashboard competition list not scoped to the owner | `known-bugs/bug-4-dashboard-ownership-scope.spec.ts` | Still broken — `test.fail()` |

## Out of scope (intentionally, per Developer's call)

- Anonymous submission of the application form (`/competitions/:id/apply`). The
  route now redirects anonymous visitors to `/login` (`ApplyPage.tsx`), which
  contradicts `qa-test.md`'s "confirmed truly anonymous" note for that flow — this
  looks like an intentional product change (the homepage copy changed to "заявка
  подається з кабінету тренера або учасника"), not a regression. Left untested by
  request until that's confirmed as a product decision.
- The 7-step competition creation wizard (`/competitions/new`) — only reachable
  end-to-end once BUG-2 is fixed (a new Organizer has no template to fall back on).
- Judge and Admin roles — no self-registration path / no seeded credentials
  available (same gap `qa-test.md` flagged).
