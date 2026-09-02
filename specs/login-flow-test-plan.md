# Test Plan: Login Flow — DanceFest

**Application under test:** DanceFest (React + Vite frontend @ http://localhost:5173, NestJS backend @ http://localhost:4000)
**Feature:** Login (`/login` page, `POST /auth/login`, related session/redirect/logout behavior)
**Author:** QA (generated via static code analysis of `frontend/src/pages/LoginPage.tsx`, `frontend/src/lib/auth.ts`, `backend/src/auth/*`)
**Date:** 2026-09-02
**Status:** Draft — requires live verification (see note at top of this document)

> **Important note on methodology:** This plan was produced by reading the actual source code (LoginPage, RegisterPage, auth.ts, AuthController, AuthService, JwtStrategy, RefreshTokenStoreService, route guards in every protected page) rather than by exercising the live app in a browser. Every scenario below should be executed manually/automated against the running app to confirm actual behavior before this plan is considered verified. Places where behavior is inferred from code (not yet confirmed live) are marked **[TO VERIFY LIVE]**.

---

## 1. Scope

**In scope:**
- `/login` page UI and client-side validation
- `POST /auth/login` (all 4 roles: ADMIN, PARTICIPANT, COACH, ORGANIZER)
- Session persistence (`localStorage` key `dansefest.session`)
- Post-login redirects
- Token refresh (`POST /auth/refresh`) as triggered by 401 responses
- Logout (`POST /auth/logout`, client-side session clearing)
- Access to protected pages with/without a valid session

**Out of scope (separate systems, per project architecture):**
- Judge login (`JudgePage.tsx`, `judges-auth.controller.ts`) — a fully separate JWT auth system, not part of `/auth/*`.
- Registration flow itself (`/register`) — only used here to prepare test data.
- Competition management business logic — organizers currently cannot manage competitions (Admin-only by design; see `roles-auth-architecture` note), this is not a login-flow bug.

## 2. Environment & Prerequisites

- Frontend running at `http://localhost:5173`, backend at `http://localhost:4000`, both via docker-compose, DB and Redis available (refresh tokens are stored in Redis, see `RefreshTokenStoreService`).
- Browser dev tools available (to inspect `localStorage`, Network tab, and to simulate corrupted storage / offline backend).
- Ability to reset test data between runs (fresh DB or unique emails per test).

## 3. Test Data

| Role | Source | Credentials |
|---|---|---|
| ADMIN | Seeded via `backend/seeders/20260822090000-mock-admin.ts` | email: `mock@dansefest.local`, password: `mock1234` |
| PARTICIPANT | Create via `/register` (role tab "Учасник") | e.g. `participant.test@example.com` / `Test1234` |
| COACH | Create via `/register` (role tab "Тренер") — requires selecting/creating a school | e.g. `coach.test@example.com` / `Test1234` |
| ORGANIZER | Create via `/register` (role tab "Організатор") | e.g. `organizer.test@example.com` / `Test1234` |

**Note:** The `/register` UI only exposes ORGANIZER, COACH, PARTICIPANT tabs (`REGISTERABLE_ROLES`). ADMIN accounts cannot be self-registered through the UI — the only route is the seeded mock admin, or a direct `POST /auth/register` API call with `role: "ADMIN"` (backend `RegisterDto` technically allows it, but UI hides it). This should be confirmed live and flagged if a tester needs a second ADMIN account for concurrency tests.

## 4. Assumptions

- Fresh browser session (cleared `localStorage`/cookies) unless a scenario explicitly states otherwise.
- Each functional/negative scenario is independent and can run in any order, using unique test accounts where account state matters.
- No CAPTCHA or MFA is implemented (confirmed absent from `AuthController`/`AuthService`).

---

## 5. Positive Scenarios

### TC-LOGIN-001 — Successful login as PARTICIPANT
**Preconditions:** A PARTICIPANT account exists (see Test Data); user is logged out, browser storage clear.
**Steps:**
1. Navigate to `http://localhost:5173/login`.
2. Confirm the "Учасник" (Participant) tab is selected by default.
3. Enter valid email and password for the PARTICIPANT test account.
4. Click "Увійти".
**Expected result:**
- Request `POST /auth/login` with `{ email, password, role: "PARTICIPANT" }` returns 201 with `accessToken`, `refreshToken`, `user` profile.
- `localStorage["dansefest.session"]` contains `{ role: "PARTICIPANT", accessToken, refreshToken, profile }`.
- User is redirected to `/` (home page), not `/dashboard`.
- No visible error message.

### TC-LOGIN-002 — Successful login as COACH
Same as TC-LOGIN-001 but select "Тренер" tab and use COACH credentials.
**Expected result:** Session role `COACH`, redirect to `/`.

### TC-LOGIN-003 — Successful login as ORGANIZER
Same as TC-LOGIN-001 but select "Організатор" tab and use ORGANIZER credentials.
**Expected result:** Session role `ORGANIZER`, redirect to `/`.

### TC-LOGIN-004 — Successful login as ADMIN
Same pattern, select "Адмін" tab, use seeded admin credentials (`mock@dansefest.local` / `mock1234`).
**Expected result:**
- Session role `ADMIN`, profile is `{ id, name, email }` (from `raw.admin`, not `raw.user`).
- User is redirected to `/dashboard` (only role that redirects there — verify `role === 'ADMIN' ? '/dashboard' : '/'` logic).
- Dashboard loads and shows the competitions list; `AdminHeader` shows the admin's email and a "Вийти" (logout) button.

### TC-LOGIN-005 — Role tabs are switchable and reflect selection in the request
**Steps:** On `/login`, click through all four role tabs without submitting.
**Expected result:** `aria-selected` toggles correctly on each tab (`role="tablist"`/`role="tab"`), only one active at a time; the role actually sent on submit matches the last tab clicked, not the initially-default `PARTICIPANT`.

### TC-LOGIN-006 — Navigate to Register from Login
**Steps:** Click "Зареєструватися" link at bottom of login card.
**Expected result:** Navigates to `/register`.

---

## 6. Negative Scenarios

### TC-LOGIN-101 — Wrong password
**Steps:** Enter a valid email (existing PARTICIPANT account) with an incorrect password, correct role selected, submit.
**Expected result:**
- `POST /auth/login` returns 401.
- UI shows generic error: **"Невірний email, пароль або роль"** (from backend `INVALID_CREDENTIALS_MESSAGE`).
- No session is saved to `localStorage`; user stays on `/login`.
- Submit button returns to enabled/"Увійти" state (not stuck on "Вхід...").

### TC-LOGIN-102 — Non-existent email
**Steps:** Enter an email that has never been registered, any password, any role, submit.
**Expected result:** Same generic 401 message as TC-LOGIN-101 — **the app must not reveal whether the email exists** (verify the message text is identical between wrong-password and unknown-email cases, confirming no user-enumeration leak).

### TC-LOGIN-103 — Correct email/password but wrong role selected
**Preconditions:** A PARTICIPANT account exists.
**Steps:** Enter the PARTICIPANT's correct email + password, but select "Тренер" (COACH) tab, submit.
**Expected result:**
- Backend looks up the email only in the `coaches` table (role-scoped lookup — `CoachesService.findByEmail`), finds nothing, and returns the same generic 401 "Невірний email, пароль або роль" — not a distinct "wrong role" message.
- This confirms role is effectively part of the lookup key, and cross-role credential reuse is rejected without hinting the account exists under a different role.

### TC-LOGIN-104 — Empty email field
**Steps:** Leave email blank, fill password, click "Увійти".
**Expected result:** Browser-native HTML5 validation blocks submission (input has `required` + `type="email"`) — no network request is sent, no custom in-app error appears. **[TO VERIFY LIVE]**

### TC-LOGIN-105 — Empty password field
**Steps:** Fill email, leave password blank, submit.
**Expected result:** Same as TC-LOGIN-104 — native `required` validation blocks submit client-side.

### TC-LOGIN-106 — Both fields empty
**Steps:** Submit with both fields empty.
**Expected result:** Native validation blocks submit; focus moves to first invalid field (email).

### TC-LOGIN-107 — Invalid email format
**Steps:** Enter `not-an-email` (no `@`) in the email field, valid password, submit.
**Expected result:** Native `type="email"` validation blocks submission before any request is sent.

### TC-LOGIN-108 — Invalid email format that bypasses HTML5 check but fails backend `@IsEmail`
**Steps:** Using dev tools, submit a value HTML5 accepts as "email-like" but that the backend may reject differently (e.g., `user@localhost` or trailing spaces `"user@example.com "`), OR intercept the request directly (Postman/curl) to `POST /auth/login` with a malformed email.
**Expected result:** Backend `LoginDto` `@IsEmail()` rejects with 400 Bad Request; frontend shows fallback message "Не вдалося увійти. Перевірте email та пароль." (generic catch, since a 400 without a parseable `message` array falls to `extractErrorMessage`'s fallback, or shows the class-validator message if returned in `message`). Verify actual displayed text.

### TC-LOGIN-109 — Missing/invalid role sent to backend
**Steps:** Via direct API call, POST `/auth/login` with `role: "SUPERADMIN"` (not in enum) or omit `role` entirely.
**Expected result:** 400 Bad Request from `@IsEnum(Role)` validation. Not directly reachable from UI (role is always one of the 4 tab values), but should be verified as a backend contract test.

### TC-LOGIN-110 — Whitespace-only password
**Steps:** Enter valid email, password consisting only of spaces, submit.
**Expected result:** `IsNotEmpty()` on backend does not trim, so a whitespace string technically passes DTO validation, then fails bcrypt compare → generic 401 "Невірний email, пароль або роль". Confirm no crash/500.

### TC-LOGIN-111 — SQL/NoSQL injection or script injection in email/password fields
**Steps:** Enter `' OR '1'='1` or `<script>alert(1)</script>` style payloads in email/password, submit.
**Expected result:** Request is either rejected by `@IsEmail()` (for the email field) or safely fails as invalid credentials (Sequelize ORM parameterizes queries); no script execution reflected in the error message on screen (check the error `<p>` renders as text, not HTML).

### TC-LOGIN-112 — Case sensitivity of email
**Steps:** Register with `Test@Example.com`, then log in using `test@example.com` (different case).
**Expected result:** Determine and document actual behavior — whether email lookup is case-sensitive or not (depends on DB column collation, not visible from the code read; **[TO VERIFY LIVE]**). Flag as a bug if legitimate users can't log in due to case mismatch.

### TC-LOGIN-113 — Leading/trailing whitespace in email
**Steps:** Enter `  test@example.com  ` (with spaces) for a valid account, correct password, submit.
**Expected result:** Frontend does not trim the email before sending (confirm in Network tab). Document whether login succeeds or fails — likely fails since `@IsEmail()` may reject padded strings or lookup won't match. Consider a UX bug report if it fails silently with the generic message.

### TC-LOGIN-114 — Backend unreachable / network error
**Steps:** Stop the backend container (or simulate via devtools offline mode), attempt login with valid-looking credentials.
**Expected result:** `fetch` throws, caught in `auth.ts`'s `postAuth`, surfaces as `AuthError("Не вдалося з'єднатися з сервером")`. UI displays this message; submit button re-enables.

### TC-LOGIN-115 — Backend returns unexpected/malformed response shape
**Steps:** (If feasible via mocked response) — login succeeds (201) but response body has neither `admin` nor `user` field for the selected role.
**Expected result:** `toSession()` throws `AuthError('Сервер повернув неочікувану відповідь')`, shown to user; no partial/corrupt session is saved.

### TC-LOGIN-116 — Rapid repeated failed login attempts (brute force)
**Steps:** Submit 10+ wrong-password attempts in quick succession for the same account.
**Expected result — per code review:** No rate limiting or account lockout exists in `AuthController`/`AuthService` (no `ThrottlerGuard` found in the auth module). Document this as a **security observation** rather than a pass/fail bug unless the team has an explicit requirement — flag for backend team.

---

## 7. Edge Cases

### TC-LOGIN-201 — Redirect target differs by role
**Steps:** Log in once as ADMIN, once (separately, fresh session) as PARTICIPANT/COACH/ORGANIZER.
**Expected result:** ADMIN → `/dashboard`; all other roles → `/` (home). Confirm this explicitly for all three non-admin roles, since only ADMIN currently has a dashboard/management UI (organizers cannot manage competitions per current architecture — this is intentional, not a bug).

### TC-LOGIN-202 — Session persists across page reload
**Steps:** Log in as any role, refresh the browser page (F5).
**Expected result:** `localStorage["dansefest.session"]` persists; user remains "logged in" for purposes of `getToken()`-guarded pages (e.g., ADMIN can reload `/dashboard` without being kicked to `/login`).

### TC-LOGIN-203 — Session persists across new tab / browser restart
**Steps:** Log in, open a new tab to the same origin (or fully close/reopen the browser without clearing storage).
**Expected result:** Session is shared (localStorage is not tab-scoped), user remains logged in in the new tab.

### TC-LOGIN-204 — Already logged in, user navigates back to `/login`
**Steps:** Log in as any role, then manually navigate to `/login` again.
**Expected result — per code review:** `LoginPage` has no guard/redirect for an existing session; the login form is shown again regardless of current session state. Document actual behavior; consider flagging as a UX gap (typically apps redirect an already-authenticated user away from the login page). **[TO VERIFY LIVE]**

### TC-LOGIN-205 — Logging in again as a different role overwrites the previous session
**Steps:** Log in as PARTICIPANT, without logging out, go back to `/login`, log in again as ADMIN using the seeded admin account.
**Expected result:** `saveSession()` overwrites the single `dansefest.session` key — the app supports only one active session at a time (no multi-role concurrent sessions). Confirm the participant's session data is fully replaced and the app now behaves as ADMIN.

### TC-LOGIN-206 — Accessing a protected page without being logged in
**Steps:** Clear storage, directly navigate to `/dashboard`, `/competitions/new`, `/competitions/:id/edit`, `/competitions/:id/team`, `/category-templates`.
**Expected result:** Every one of these pages checks `getToken()` and redirects to `/login` via `<Navigate replace />` if absent. Verify each route individually — this list was gathered via `getToken()` guard search across pages.

### TC-LOGIN-207 — Accessing ADMIN-only pages while logged in as a non-admin role
**Preconditions:** Logged in as PARTICIPANT (or COACH/ORGANIZER).
**Steps:** Navigate directly to `/dashboard`.
**Expected result — per code review, potential bug:** `DashboardPage`'s guard only checks `getToken()` (i.e., "is *any* role logged in"), not the specific role. It separately calls `getStoredAdmin()`, which returns `null` for non-ADMIN roles. This means a non-admin, logged-in user is **not redirected away** from `/dashboard` — they'll see the shell of the dashboard with `admin` treated as `null`. Verify live whether this causes a visible crash, a broken UI (undefined admin name/email), or silently renders with missing data. **This is a likely role-authorization gap worth flagging to the dev team** — the same pattern repeats in `CategoryTemplatesPage`, `CompetitionDetailPage`, `CompetitionEditPage` (all check `getToken()` only, some additionally check `getStoredAdmin()` and redirect to `/dashboard` if null, others don't). Cross-check each page's actual behavior.

### TC-LOGIN-208 — Access token expiry triggers silent refresh
**Preconditions:** Logged in, access token is valid but nearing/at expiry (default `JWT_EXPIRES_IN_SECONDS` = 86400s/24h — may need to shorten via env var for practical testing, or manually corrupt/expire the stored token).
**Steps:** Perform an action that calls `authorizedFetch` (e.g., load the dashboard's competition list) after the access token has expired.
**Expected result:** First request returns 401 → `authorizedFetch` automatically calls `POST /auth/refresh` with the stored refresh token → on success, retries the original request with the new access token and updates `localStorage` silently (no visible interruption to the user).

### TC-LOGIN-209 — Refresh token expired/invalid
**Steps:** Manually set an invalid/garbage `refreshToken` value in the stored session (or wait past `JWT_REFRESH_EXPIRES_IN_SECONDS`, default 30 days), then trigger an authorized request that gets a 401.
**Expected result:** `refreshSession()` fails, `clearSession()` is called, and `redirectToLogin()` sends the user to `/login` (only if not already there). Confirm the user actually lands on `/login` and that stale data isn't shown.

### TC-LOGIN-210 — Refresh token reuse after it was already rotated
**Preconditions:** Logged in; capture the original `refreshToken`.
**Steps:** Trigger one successful `/auth/refresh` call (new token pair issued — note `AuthService.refresh` revokes the old `jti` in Redis and issues a new one). Then attempt to call `/auth/refresh` again using the **original** (now-rotated) refresh token.
**Expected result:** Backend's `refreshTokenStore.isActive()` check fails since the old `jti` was revoked → 401 "Refresh-токен відкликаний або вже використаний" (`REFRESH_TOKEN_REVOKED_MESSAGE`). This confirms refresh-token rotation/reuse detection works as designed.

### TC-LOGIN-211 — Logout does not appear to revoke the refresh token server-side
**Preconditions:** Logged in as ADMIN (only role with a visible logout button, in `AdminHeader`).
**Steps:** Click "Вийти" (logout). Before doing so, capture the current `refreshToken` value from `localStorage`. After logout, attempt to manually call `POST /auth/refresh` with that captured token (e.g., via curl/Postman).
**Expected result — per code review, potential security gap:** `AdminHeader.handleLogout()` only calls `clearSession()` (clears local storage) and navigates to `/login` — it does **not** call the backend `POST /auth/logout` endpoint that would revoke the refresh token in Redis. If confirmed live, this means a captured refresh token remains valid and could be used to mint new access tokens even after the user "logs out" in the UI. **Flag this to the dev team as a security finding if confirmed.**

### TC-LOGIN-212 — No logout affordance for non-admin roles
**Preconditions:** Logged in as PARTICIPANT, COACH, or ORGANIZER.
**Steps:** Look for a logout control anywhere in the UI (`Header.tsx` is used on the home page for all roles and unconditionally shows a "Увійти" (Login) link, not a logged-in state or logout button; `AdminHeader` — which has the logout button — is only rendered on admin pages).
**Expected result — per code review, likely UX gap:** Non-admin roles have no visible way to log out through the UI once logged in (short of manually clearing `localStorage`). Confirm live and report as a UX/functional gap if true.

### TC-LOGIN-213 — Header does not reflect logged-in state
**Preconditions:** Logged in as any role, navigate to `/` (home).
**Steps:** Observe the header.
**Expected result — per code review:** `Header.tsx` always renders a static "Увійти" (Login) link regardless of session state — it never shows the user's name/email or a logout option, even when a valid session exists in `localStorage`. Confirm live; likely a UX defect since a logged-in user sees no indication they're authenticated on the home page.

### TC-LOGIN-214 — Corrupted/malformed session data in localStorage
**Steps:** Manually edit `localStorage["dansefest.session"]` to invalid JSON (e.g., truncate it or set to `"{not json"`), then reload any page that calls `getSession()`/`getToken()` (e.g., `/`, `/dashboard`).
**Expected result — per code review, potential bug:** `getSession()` calls `JSON.parse(raw)` with no `try/catch` — malformed JSON will throw an uncaught exception, likely breaking page rendering entirely (blank page / React error boundary if any, or console error with nothing rendered). Confirm live; if it breaks the app, report as a robustness bug (should fail gracefully back to "logged out" state).

### TC-LOGIN-215 — Submit button double-click / rapid resubmission
**Steps:** On `/login`, fill valid credentials, click "Увійти" twice in rapid succession (or hold Enter).
**Expected result:** Button is disabled while `submitting` is `true` ("Вхід..." label) — verify no duplicate `POST /auth/login` requests fire, and no race condition causes two different sessions to be saved.

### TC-LOGIN-216 — Browser back button after login
**Steps:** Log in as PARTICIPANT (redirects to `/`), press browser Back.
**Expected result:** Since `navigate(..., { replace: true })` is used, `/login` should not be in history — Back should not return to the login form with old field values. Confirm this replace behavior live.

### TC-LOGIN-217 — Browser back button after logout (ADMIN)
**Steps:** Logged in as ADMIN, view `/dashboard`, log out (redirected to `/login`), press browser Back.
**Expected result:** Determine whether the previously cached `/dashboard` view is shown from bfcache with stale data, or whether the guard (`getToken()`) re-evaluates and redirects to `/login` again. Document actual behavior.

### TC-LOGIN-218 — Autocomplete / password manager attributes
**Steps:** Inspect the email/password inputs.
**Expected result:** `autoComplete="email"` and `autoComplete="current-password"` are present (confirmed in code) — verify browsers/password managers correctly offer to save/fill credentials on this form.

---

## 8. UI / UX / Accessibility Checks

### TC-LOGIN-301 — Role tab accessibility
**Steps:** Use keyboard only (Tab/Arrow keys/Enter) to navigate and select a role tab, then complete the form.
**Expected result:** Tabs are focusable and operable via keyboard; `role="tablist"`/`role="tab"`/`aria-selected` are present (confirmed in code) — verify screen-reader announces the tab list and selection changes correctly.

### TC-LOGIN-302 — Error message is visible and associated with the form
**Steps:** Trigger a login error (e.g., wrong password).
**Expected result:** Error text appears above the form fields (`<p className={styles.error}>`); verify sufficient color contrast and that it's announced by screen readers (no `role="alert"` observed in code — consider flagging as an accessibility improvement).

### TC-LOGIN-303 — Field labels and required indicators
**Steps:** Inspect email/password fields.
**Expected result:** Both have associated `<label htmlFor>` elements and `required` attributes; placeholders (`user@example.com`, `••••••••`) are present as supplementary hints, not substitutes for labels (confirmed correct in code).

### TC-LOGIN-304 — Responsive layout
**Steps:** View `/login` at common breakpoints (mobile ~375px, tablet ~768px, desktop ~1440px).
**Expected result:** Card layout, role tabs, and form remain usable and legible at all sizes (visual/manual check, CSS module not fully reviewed here).

---

## 9. Security Observations Summary (for dev team follow-up)

These were identified via static code review and should be triaged, not assumed to be confirmed defects until verified live:

1. **No rate limiting / lockout** on `/auth/login` — brute-force attempts are not throttled (TC-LOGIN-116).
2. **Logout does not revoke the refresh token server-side** for the flow actually wired up in the UI (`AdminHeader` only clears local storage) — the backend `POST /auth/logout` endpoint exists but doesn't appear to be called from the login/logout UI path (TC-LOGIN-211).
3. **No visible logout control for PARTICIPANT/COACH/ORGANIZER roles** (TC-LOGIN-212).
4. **Header never reflects authenticated state** on the public home page (TC-LOGIN-213).
5. **Unhandled JSON parse exception** if `localStorage` session data is corrupted (TC-LOGIN-214).
6. **Role-only, not role-specific, route guards** on some admin pages — a non-admin logged-in user isn't redirected away from `/dashboard` by the token check alone (TC-LOGIN-207) — needs live confirmation of actual rendered behavior/impact.

Positive security notes confirmed by code review (good design, worth regression-testing to keep it that way):
- Login error messages are role/account-existence agnostic (no user enumeration) — TC-LOGIN-101/102/103.
- Refresh tokens are rotated and reuse of a revoked token is rejected — TC-LOGIN-210.
- Passwords are hashed with bcrypt (`SALT_ROUNDS = 10`), never returned in any response payload.

---

## 10. Traceability Summary

| Area | Test Case IDs |
|---|---|
| Positive login (per role) | TC-LOGIN-001–006 |
| Negative / validation | TC-LOGIN-101–116 |
| Session, redirect, refresh, logout, guards | TC-LOGIN-201–218 |
| UI/UX/Accessibility | TC-LOGIN-301–304 |
