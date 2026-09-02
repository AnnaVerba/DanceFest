# Test Plan: DanceFest — Full Application (excl. detailed Login flow)

**Application under test:** DanceFest (React + Vite frontend @ `http://localhost:5173`, NestJS backend @ `http://localhost:4000`)
**Feature scope:** Everything reachable from `frontend/src/App.tsx`'s routes except the deep-dive login mechanics already covered by `specs/login-flow-test-plan.md` — i.e. Registration, Home/public browsing, Competition detail (public + authenticated), Apply/Entry submission, Admin Dashboard, Competition creation wizard & edit, Category Templates, Competition Team (co-admins), Judges (management + Judge Cabinet), and the cross-role authorization matrix.
**Author:** QA (produced by **exercising the live running application** in a real Chrome browser — clicking through every page, submitting real forms, and inspecting the actual network responses/console/localStorage — not by reading source code)
**Date:** 2026-09-02
**Status:** Live-verified. Every scenario below is marked either **Observed live** (I personally drove this exact flow and recorded the actual result) or **Not verified live** (reachable but not exercised, with the reason noted — e.g. requires real outbound email). No scenario describes functionality that was not actually seen in the running app.

> **Methodology note:** Exploration was done directly against the docker-compose stack already running on this machine (frontend `dansefest-frontend`, backend `dansefest-backend`, Postgres `dansefest-db`). Two fresh accounts were self-registered for this session (a PARTICIPANT via the UI, and an ADMIN via a direct `POST /auth/register` call — see AUTHZ-101) and a fresh competition ("E2E Wizard Competition") was created end-to-end through the UI wizard to have a competition this session actually owns, since the pre-existing "BE-9 Smoke Test" competition belongs to a different, unknown organizer and is read-only for every account available to this session. Browser Network/Console panels (via `read_network_requests` / `read_console_messages`) were used throughout to confirm actual HTTP status codes behind what the UI shows, not just the rendered text.

---

## 1. Scope

**In scope (this document):**
- `/register` — registration for PARTICIPANT / COACH / ORGANIZER (all fields, per-role differences, validation)
- `/` — public competition list (Home)
- `/competitions/:id` — competition detail, both `PublicCompetitionPage` (logged out) and `CompetitionDetailPage` (logged in, any role)
- `/apply`, `/competitions/:id/apply` — entry/application submission
- `/dashboard` — admin-style competition list/management screen
- `/competitions/new` — 7-step competition creation wizard
- `/competitions/:id/edit` — competition edit
- `/competitions/:id/team` — competition co-admin ("team") management
- `/category-templates`, `/category-templates/new`, `/category-templates/:id/edit` — reusable nomination-category templates
- `/competitions/:id` Судді / Майданчики / Заявки tabs — judges, venues, entries management
- `/judge` — the separate Judge Cabinet (its own login system)
- Cross-role authorization behavior for every route/tab above

**Out of scope (covered elsewhere / not part of this app):**
- Deep login-flow mechanics (role tabs, session storage shape, token refresh, logout) — see `specs/login-flow-test-plan.md`.
- Actual email delivery content/deliverability — this dev environment has `GMAIL_USER`/`GMAIL_APP_PASSWORD` unset, so **no email in this app is actually sent** (see AUTHZ/JUDGE sections); only the app's own behavior when email is unavailable is testable here.
- Judge scoring math / leaderboard correctness beyond confirming the Judge Cabinet loads and lists entries — no entries had scores in this session's time window.

## 2. Environment & Prerequisites

- Frontend at `http://localhost:5173`, backend at `http://localhost:4000`, Postgres via docker-compose (`dansefest-db`), all already running.
- This is a **shared, persistent dev database** — it already contained data from prior work (a completed competition "BE-9 Smoke Test", a coach school "E2E Test School", an ORGANIZER `admin@citrineos.com` with unknown password, and two ADMIN accounts `be9-smoke@test.local` / `be9-smoke-2@test.local` with unknown passwords). **The seeded mock-admin account documented in `specs/login-flow-test-plan.md` (`mock@dansefest.local` / `mock1234`) does NOT currently exist in this database** — logging in with it returns `401` live (confirmed via `POST /auth/login`). Testers should either reseed (`npm run seed` per `backend/seeders/20260822090000-mock-admin.ts`) or self-register a fresh ADMIN before relying on that account.
- Because data is shared and persistent, use unique emails/phones per test run (a duplicate email OR phone triggers a combined uniqueness error — see REG-101).

## 3. Test Data used in this session

| Role | Email | Password | Notes |
|---|---|---|---|
| PARTICIPANT | `e2e.participant.df.9231@example.com` | `Test1234!` | Registered via UI |
| ADMIN | `e2e.admin.df@example.com` | `Test1234!` | Registered via **direct API call**, not the UI (Admin tab is hidden on `/register`) — see AUTHZ-101 |
| JUDGE | `e2e.judge.df@example.com` | temp password returned by the API on creation (not shown anywhere in the UI) | Added as a judge to "E2E Wizard Competition" |

| Competition | ID | Status | Owner |
|---|---|---|---|
| BE-9 Smoke Test | `71f219ab-ac0a-4073-8080-64089d455d81` | Завершено (completed), registration closed | pre-existing, unknown organizer — read-only for this session |
| E2E Wizard Competition | `b53b97ee-ba54-41f6-bd46-7f80a46b23ec` | Заплановано (planned), registration open | created live by this session's ADMIN account — full access |

## 4. Assumptions

- Fresh browser state (`localStorage` cleared) unless a scenario says otherwise — the app stores its session under `localStorage['dansefest.session']`.
- Each test uses a unique email + phone combination.
- Ukrainian is the only UI language observed; all test steps/expected text below are the literal strings shown live.

---

## 5. Known Issues Found During Live Exploration

These were **reproduced live** in this session and are referenced from the relevant test cases below. Reported here up front for triage; each also has a dedicated FAIL test case.

| # | Severity | Area | Summary |
|---|---|---|---|
| BUG-1 | ~~P0~~ **FIXED** | Apply/Entry (APPLY-101) | ~~The homepage explicitly states applying "реєстрація не потрібна" (no registration needed), and the backend agrees — `POST /competitions/:id/entries` succeeds with **zero** `Authorization` header (confirmed via a raw, header-less API call, `201`). But the frontend's `/apply` and `/competitions/:id/apply` pages force-redirect any logged-out visitor to `/login`, making the feature *only* usable while logged in — directly contradicting the product's own stated behavior.~~ **Fixed 2026-09-02**: removed the `if (!getToken()) return <Navigate to="/login" />` gate from `ApplyPage.tsx` (and its now-unused `getToken`/`Navigate` imports) — the page's own data calls were already anonymous-safe (public `GET` for competition/nominations, unauthenticated `POST` for the entry), so the gate was the only thing blocking it. Re-verified live: a fully logged-out visitor now loads `/competitions/:id/apply` and submits an entry successfully (`201`). |
| BUG-2 | **P1** | Authorization / UX (CDET-201..203) | On a competition's detail page, the Судді / Майданчики / Заявки tabs render identically for **every** logged-in role, including roles/accounts with no relationship to that competition. The backend correctly returns `403` for non-owners (confirmed for PARTICIPANT and for a second, unrelated ADMIN account against "BE-9 Smoke Test"), but the UI shows no error, no "access denied" state, and no toast for two of the three tabs — it just silently renders the tab's static description text with an empty list, indistinguishable from "genuinely no data yet". Only the Судді tab occasionally surfaces a generic toast ("Не вдалося завантажити суддів.") that doesn't explain the cause. |
| BUG-3 | **P1** | Registration (REG-102) | Registering with a password/confirm-password mismatch shows **no error message at all** — the submit button simply does nothing (no request is sent, confirmed via network log), with no red text, no shake, no toast. A user has no way to know why registration didn't proceed. |
| BUG-4 | **P2** | Category Templates (CTPL-101) | Building a category template manually and adding only a "Стиль" (Style) category value, then generating nominations and submitting, sends `POST /categories/bulk` and gets back a raw, untranslated backend validation error rendered verbatim in the UI: `categories.0.type must be one of the following values: age, level, direction, discipline, participants_count`. The "Стиль" category type is not being mapped to one of the enum values the backend accepts. |
| BUG-5 | **P2** | Category Templates / Wizard (CTPL-102, WIZ-105) | Adding an "Вік" (age) category value without filling in the numeric "від"/"до" (from/to) fields is accepted, but the generated nomination label renders literally as `Дорослі (undefined–undefined)` instead of omitting the range or requiring it. |
| BUG-6 | **P2** | Judges (JUDGE-102) | When a judge is added to a competition, the API response includes `emailSent: false` and the actual `tempPassword` in plaintext (confirmed via direct API inspection) — but the **UI never displays this password anywhere**, before or after adding the judge. In this environment (no `GMAIL_USER`/`GMAIL_APP_PASSWORD` configured, confirmed in `backend/src/mail/mail.service.ts`), the email is silently never sent and the admin has no way at all, through the UI, to retrieve or hand the judge their login credentials. |
| SEC-1 | **P0 (security)** | Registration / Authorization (AUTHZ-101) | `/register` hides the "Адмін" tab in the UI, but `POST /auth/register` accepts `role: "ADMIN"` with no invite token, secret, or existing-admin approval of any kind — **any anonymous caller can self-register a fully privileged ADMIN account** via a raw API call. Confirmed live: `curl -X POST http://localhost:4000/auth/register -d '{"role":"ADMIN","name":"...","email":"...","password":"..."}'` → `201` with a working access token. |

---

## 6. REGISTRATION — `/register`

### 6.1 Happy paths

**TC-REG-001 — Register as PARTICIPANT (P0)**
Preconditions: logged out, unique email/phone.
Steps: Go to `/register` → "Учасник" tab is selected by default → fill Ім'я, Прізвище, Телефон, Email, Дата народження, Пароль, Повторіть пароль → submit.
Expected (**Observed live**): `POST /auth/register` → `201`. Auto-login happens immediately (no separate login step) — session is stored and the user is redirected to `/`, same as a normal PARTICIPANT login.

**TC-REG-002 — Register as ORGANIZER (P0)**
Same as REG-001 on the "Організатор" tab. Fields: Ім'я, Прізвище, Телефон, Email, Пароль, Повторіть пароль (no birth date, no school). **Observed live**: succeeds, auto-login, redirect to `/`.

**TC-REG-003 — Register as COACH, selecting an existing school (P1)**
Steps: "Тренер" tab → note the extra "Школа / Гурт" dropdown, pre-populated with existing schools (e.g. "E2E Test School" was present live) → select one → fill remaining fields → submit.
Expected: succeeds; `schoolId` sent references the selected school.

**TC-REG-004 — Register as COACH, creating a new school inline (P1)**
Steps: "Тренер" tab → click "+ Немає потрібної школи — створити" → a "Назва школи/студії" text field + "Додати" button appear inline → type a name → click "Додати" → the new school becomes selectable/selected → complete the rest of the form → submit.
Expected (**Observed live** through the reveal of the inline creation UI): the create-school control appears correctly; full submit-through-creation was not completed in this session (time-boxed) — **verify the new school actually persists and appears for other coaches afterward.**

**TC-REG-005 — Role tabs change the visible field set live (P1)**
Steps: On `/register`, click each tab without submitting.
Expected (**Observed live**): Організатор/Тренер show Ім'я/Прізвище/Телефон/Email/Пароль/Підтвердження, no extra field for Організатор; Тренер adds the school selector; Учасник adds a "Дата народження" date field instead. A helper note appears under the date field: *"Ліга не закріплюється при реєстрації — її обирають при подачі кожної заявки."* (league is chosen per-application, not at registration).

### 6.2 Validation / negative

**TC-REG-101 — Duplicate email OR phone (P1)**
Steps: Register with an email or a phone number already used by any existing account (any role), submit.
Expected (**Observed live**): `POST /auth/register` returns an error; UI shows: *"Користувач з таким email або телефоном вже існує"*. Note this is a combined check — email and phone are not validated as separately-unique in the error message shown to the user.

**TC-REG-102 — Password / confirm-password mismatch shows no feedback (P1 — BUG-3, confirmed FAIL)**
Steps: Fill a valid registration form but make "Повторіть пароль" differ from "Пароль" → submit.
Expected: a validation message should appear and/or the field should be flagged.
**Actual (Observed live):** no request is sent (confirmed via network log — zero `/auth/register` calls fire), and **no error text, styling change, or toast appears anywhere on the page.** The button click is a silent no-op. **FAIL — see BUG-3.**

**TC-REG-103 — Required-field omissions (P1)**
Steps: Try to submit with each required field empty in turn (Ім'я, Прізвище, Телефон, Email, Пароль).
Expected: HTML5 / client-side validation blocks submission (fields are marked `required`). **Not fully verified live for every field individually** — verify each field's specific blocking behavior and whether any messaging is shown (given REG-102's silent-failure pattern, this should be checked carefully for every field, not assumed).

**TC-REG-104 — Invalid email format (P2)**
Steps: Enter a non-email string in Email, submit.
Expected: blocked client-side by `type="email"`. **Not verified live in this session.**

**TC-REG-105 — Password shorter than minimum length (P2)**
Steps: Enter a very short password (e.g. `"a"`), matching confirm value, submit.
Expected: backend `MinLength` on `RegisterDto.password` should reject with `400`. **Not verified live** — worth checking whether the frontend pre-validates this or lets the raw backend message through (cf. BUG-4's precedent of leaking raw validator text).

**TC-REG-106 — Injection / script payloads in name/city-like free-text fields (P2)**
Steps: Enter `<script>alert(1)</script>` or SQL-injection-style strings in Ім'я/Прізвище.
Expected: stored/echoed as inert text, not executed. **Not verified live in this session** — recommend checking given BUG-4 shows raw backend strings do get rendered directly into the DOM in at least one place.

### 6.3 Edge cases

**TC-REG-201 — Register ADMIN is impossible through the UI, but possible through the API (P0 — see SEC-1)**
Expected/Observed live: The "Адмін" tab does not exist on `/register`. However `POST /auth/register` with `role:"ADMIN"` and a `name` field (no `firstName`/`lastName`/`phone` needed for this role, per the DTO) succeeds with `201` and returns a fully working ADMIN session — **with no authorization check of any kind**. This is a critical finding; see AUTHZ-101 for the full authorization test and SEC-1 above.

---

## 7. HOME — `/`

**TC-HOME-001 — Logged-out public list (P0)**
**Observed live**: shows heading "Танцювальні конкурси", subtitle "Оберіть конкурс і подайте заявку на участь — реєстрація не потрібна.", and a card per competition with banner placeholder, status badge (e.g. "ЗАВЕРШЕНО"), name, date range, and city. Header shows "Увійти" link, not a logout button.

**TC-HOME-002 — Logged-in list, any role (P1)**
**Observed live** for PARTICIPANT: identical layout to logged-out, header shows a logout button instead of "Увійти". No role-specific content differences were observed on this page itself (differences appear once a card is clicked — see CDET section).

**TC-HOME-003 — Click a competition card navigates to its detail page (P0)**
**Observed live**: clicking the card (via its `<a>` wrapping the whole card) navigates to `/competitions/:id`.

**TC-HOME-004 — Empty state (P2)**
Not verified live — a competition always existed during this session (at least "BE-9 Smoke Test" pre-existed). **Verify** what Home renders when zero competitions exist (blank list vs. an explicit empty-state message).

---

## 8. COMPETITION DETAIL — `/competitions/:id`

The route renders **two entirely different components** depending on auth state (from `App.tsx`): `PublicCompetitionPage` when logged out, `CompetitionDetailPage` (with management tabs) when logged in — **for any role**, not just the owner.

### 8.1 Public view (logged out)

**TC-CDET-001 — Public competition page content (P0)**
**Observed live**: header shows only "Увійти"; back link "До всіх конкурсів"; a single "Подати заявку" button/link; competition card shows Статус, Дата, Місце, Організатор, Реєстрація period, description text, Контакти (phone as `tel:` link, email as `mailto:` link), and Реквізити для оплати (payment details, or "Організатор не вказав реквізити для оплати" if none set).
No Номінації/Судді/Майданчики/Заявки tabs are present in this view.

**TC-CDET-002 — "Подати заявку" link target (P0)**
**Observed live**: the link points to `/competitions/:id/apply`. See BUG-1/APPLY-101 — following it while logged out currently bounces to `/login`, contradicting the page's own premise.

### 8.2 Authenticated view — any logged-in role

**TC-CDET-101 — Authenticated competition page shows management chrome for every role (P1 — related to BUG-2)**
Steps: log in as PARTICIPANT (an account with no relationship to the competition) → open `/competitions/:id` for an existing competition.
Expected: a role-appropriate, read-only view.
**Actual (Observed live):** identical `CompetitionDetailPage` as an owning ADMIN would see — full admin-style top nav ("Конкурси" → `/dashboard`, "Шаблони категорій" → `/category-templates"), and five tabs: Деталі, Номінації, Судді, Майданчики, Заявки. Nothing in the UI indicates this PARTICIPANT does not manage the competition.

**TC-CDET-102 — Деталі tab (P1)**
**Observed live**: same fields as the public view (Статус/Дата/Місце/Організатор/Реєстрація/description/Контакти/Реквізити), plus, only for the owning account, "Видалити"/"Редагувати" buttons at the bottom (**Observed live**: absent for BE-9 as a non-owner ADMIN/PARTICIPANT; present for "E2E Wizard Competition" as its creator).

**TC-CDET-103 — Номінації tab is readable by any authenticated role (P1)**
**Observed live**: `GET /competitions/:id/nominations` returns `200` for PARTICIPANT, and even with **zero** `Authorization` header at all (confirmed via raw curl) — this endpoint is effectively public/unauthenticated-readable, consistent with it also backing the anonymous Apply form.

**TC-CDET-201 — Судді tab, non-owner: silent 403 (P1 — BUG-2, confirmed FAIL)**
Steps: as PARTICIPANT (or as a second, unrelated ADMIN account), open the Судді tab of a competition you don't own.
Expected: a clear "you don't have access" state.
**Actual (Observed live)**: `GET /competitions/:id/judges` → `403` (confirmed for both PARTICIPANT and an unrelated ADMIN account, same competition). UI shows only the tab's static helper text ("Суддя отримує тимчасовий пароль…") with no list, no error, no explanation — occasionally a generic toast "Не вдалося завантажити суддів." appears, but it doesn't say why or what to do. **FAIL.**

**TC-CDET-202 — Майданчики tab, non-owner: silent 403 (P1 — BUG-2, confirmed FAIL)**
Same pattern as CDET-201: `GET /competitions/:id/venues` → `403` for PARTICIPANT; tab shows only static description text, no error indication at all (no toast even).

**TC-CDET-203 — Заявки tab, non-owner: silent 403 (P1 — BUG-2, confirmed FAIL)**
Same pattern: `GET /competitions/:id/entries` → `403` for PARTICIPANT; the tab still renders its full filter/sort toolbar (nomination/age/league/program filters, sort dropdown, "Форма подачі заявки ↗" link) as if fully functional, with an empty result and no error shown.

**TC-CDET-204 — Owner can view Судді/Майданчики/Заявки normally (P0, contrast case)**
**Observed live** on "E2E Wizard Competition" as its creating ADMIN: `GET .../judges` → `200`, showing "Суддів ще не додано" + "Додати" button (correct empty state, not an error). Confirms CDET-201..203 are a genuine authorization/error-surfacing gap, not just "always broken".

**TC-CDET-205 — Nonexistent competition ID (P2)**
Steps: navigate to `/competitions/00000000-0000-0000-0000-000000000000`.
Expected/**Observed live**: graceful failure — "Не вдалося завантажити конкурс." with a "До всіх конкурсів" back link. No crash, no blank white page.

---

## 9. APPLY / SUBMIT ENTRY — `/apply`, `/competitions/:id/apply`

**TC-APPLY-001 — Submit an entry while logged in (P0, happy path)**
**Observed live** (as PARTICIPANT, on BE-9 Smoke Test): fill Назва номеру\*, select Номінація\* ("Solo"), optionally Хореограф/Місто/К-сть учасників, leave Спосіб оплати at its default, leave Музика для виступу empty, submit.
Result: `POST /competitions/:id/entries` → `201`. Inline confirmation replaces the top of the form: *"Заявку надіслано, номер 2. Спосіб оплати: картка."* — confirms the default payment method is "картка" (card) when not explicitly toggled, and that music upload is optional.

**TC-APPLY-002 — `/apply` with no competition id (P2)**
**Observed live**: shows a graceful explainer — "Оберіть конкурс" / "Ця сторінка призначена для подання заявки на конкретний конкурс — перейдіть за посиланням «Форма подачі заявки» зі сторінки потрібного конкурсу." with a "← На головну" link. No crash.

**TC-APPLY-101 — Anonymous (logged-out) visitor can reach the apply form (P0 — BUG-1, FIXED)**
Steps: fully logged out (localStorage cleared), navigate directly to `/competitions/:id/apply` for **any** competition, including one with open registration.
Expected (per Home page's own copy: "реєстрація не потрібна"): the apply form loads and can be submitted with no account.
**Originally (Observed live, reproduced on two different competitions):** immediately redirected to `/login`. **FAIL.**
**After fix (Re-verified live 2026-09-02):** `ApplyPage.tsx`'s unconditional `getToken()` → `<Navigate to="/login">` gate was removed. Logged-out visitor now loads the form and successfully submits an entry (`POST /competitions/:id/entries` → `201`, confirmation "Заявку надіслано..." shown). **PASS.**

**TC-APPLY-102 — Backend confirms entries require no authentication at all (P0, root-cause confirmation for BUG-1)**
**Observed live via direct API calls** (bypassing the frontend entirely): `POST /competitions/:id/entries` with **no `Authorization` header whatsoever** → `201`, entry created successfully (`"number":2, routineName:"Anon Test Routine"`). This proves the block in APPLY-101 is a **frontend-only** defect (almost certainly inside `ApplyPage.tsx`'s own mount logic, since the route itself is not guarded in `App.tsx`), not a backend restriction — i.e. it should be a straightforward fix.

**TC-APPLY-103 — Required field validation (P1)**
Steps: submit with Назва номеру or Номінація empty.
Expected: blocked, with a message. **Not fully verified live in this session** — recommend explicit coverage given the silent-failure pattern already seen twice (REG-102, and the entries filters returning empty with no error in CDET-201..203).

**TC-APPLY-104 — Submitting to a competition with closed registration (P1)**
**Observed live**: submitting an entry to "BE-9 Smoke Test" succeeded (`201`) even though its Реєстрація window ("1 серпня 2026 – 25 серпня 2026") had already passed relative to the app's current date (2 вересня 2026, per the competition's own Дата field). **Confirm whether this is intended** (organizer may want a hard cutoff) — currently entries can be submitted after the advertised registration deadline with no warning.

**TC-APPLY-105 — Payment method toggle (Готівка/Картка) (P2)**
Not verified live beyond confirming the default (card) is used when untouched — **verify explicitly selecting "Готівка" (cash) is reflected correctly in the confirmation message and in the entry data.**

**TC-APPLY-106 — Music file upload (P2)**
Not verified live — the field ("Музика для виступу") was left empty in the tested happy path and submission still succeeded, confirming it's optional. **Verify** actual upload (file type/size restrictions, playback/storage) separately.

---

## 10. DASHBOARD — `/dashboard`

**TC-DASH-001 — Logged-out access is correctly blocked (P0)**
**Observed live**: navigating to `/dashboard` while logged out redirects to `/login`. Correct.

**TC-DASH-002 — Any authenticated role can view the full admin dashboard (P1 — authorization gap, related to BUG-2's theme)**
**Observed live as PARTICIPANT**: `/dashboard` renders completely normally — heading "Конкурси", stat tiles ("Всього конкурсів", "З реквізитами", "Цього місяця"), search box, sort dropdown, "Новий конкурс" button, and the full competitions table (Назва/Статус/Дата/Місце/Організатор/Контакт/Дії) listing **every** competition in the system, not just ones related to this PARTICIPANT. `GET /competitions` returns `200` for this account. **This list endpoint itself is not role-restricted** — contrast with CDET-201..203 where the per-competition management sub-resources correctly are.

**TC-DASH-003 — Dashboard stats reflect real data (P2)**
**Observed live**: with one pre-existing competition, tiles read "1 / Всього конкурсів", "1 / З реквізитами", "1 / Цього місяця" — plausible/correct for that state. **Not independently cross-checked against DB with multiple competitions.**

**TC-DASH-004 — Search and sort controls (P2)**
Present live (search box "Пошук за назвою, місцем або організатором...", sort select "За датою"/"За назвою"/"За організатором") but their actual filtering/sorting behavior was **not exercised live in this session** — verify with 2+ competitions.

**TC-DASH-005 — "Новий конкурс" button navigates to the wizard (P0)**
**Observed live**: navigates to `/competitions/new`.

**TC-DASH-006 — Row click navigates to that competition's detail page (P0)**
**Observed live**: clicking a competition's name navigates to `/competitions/:id`.

**TC-DASH-007 — "Дії" (Actions) column (P2)**
**Observed live**: for a competition this account does not own, the Дії cell renders empty — no icons/buttons at all. **Verify** what appears for an owned competition in this column specifically (Редагувати/Видалити were found instead on the detail page itself, not in this column).

---

## 11. COMPETITION CREATION WIZARD — `/competitions/new`

A 7-step wizard: Загальне → Контакти → Оплата → Судді → Категорії → Майданчики → Розподіл.

**TC-WIZ-001 — Full happy-path creation as ADMIN (P0)**
**Observed live**, all 7 steps completed and submitted successfully:
1. **Загальне**: Назва конкурсу\*, Опис\*, Дата початку\* / Дата завершення (optional, "залиште порожнім, якщо конкурс на один день"), Місце проведення\*, Організатор\*, Реєстрація з\*/до\* — all required fields accepted.
2. **Контакти**: Контактний номер, Email — accepted empty-optional-looking but not tested empty (filled live).
3. **Оплата**: see WIZ-101 — turned out to be required, not optional.
4. **Судді**: Ім'я судді + Email судді + "Додати" — optional, skipped with no error.
5. **Категорії**: choose "Обрати готовий шаблон" (existing templates) or "Скласти власний" (build inline) — see WIZ-105 for detail; a template name + at least one generated nomination is required to proceed.
6. **Майданчики**: optional, skipped with no error.
7. **Розподіл**: read-only summary ("Немає майданчиків — додайте їх на кроці «Майданчики»." since none were added) + final "Створити конкурс" button.
Result: `POST /competitions` → `201`, `PUT /competitions/:id/payment-details` → `200`, `POST /competitions/:id/nominations/bulk` → `201`, then redirect to the new competition's detail page with all entered data correctly displayed (name, description, dates, location, organizer, contacts, payment details).

**TC-WIZ-101 — "Оплата" step is actually required despite looking optional (P1)**
Steps: leave all payment fields (Отримувач, Номер картки/IBAN, Банк, ЄДРПОУ/ІПН, Призначення платежу) empty on step 3, click "Далі".
Expected/**Observed live**: blocked with an inline error banner "Укажіть Отримувача коштів" and both Отримувач and IBAN fields outlined in red as required — contradicts the visual impression (no asterisks were shown on these labels) that this step is skippable like Судді/Майданчики.

**TC-WIZ-102 — Step navigation preserves entered data (P1)**
**Observed live**: going forward through all 7 steps and (implicitly, via the numbered tab strip staying clickable) back did not lose previously entered data — confirmed at minimum that the final created competition contained every field entered across all steps.

**TC-WIZ-103 — Category step: choose an existing template (P1)**
**Observed live** as a fresh account with zero templates: the "Обрати готовий шаблон" option is selected by default but shows "У вашому списку немає шаблонів — створіть перший" with a link to `/category-templates/new`. **Not verified live with an account that has ≥1 template** — verify template selection actually copies its nominations into the new competition ("Номінації копіюються в цей конкурс. Далі їх можна правити тут — на сам шаблон це не вплине." is the stated behavior).

**TC-WIZ-104 — Category step: build manually (P0)**
**Observed live**: switching to "Скласти власний" reveals a template-name field plus four category-value builders (Склад/Вік/Ліга/Стиль), a "Згенерувати номінації" button, and an "Додати спеціальну категорію" option. Adding one value to "Вік" and generating produces exactly 1 nomination, listed below with editable Назва/Ціна/Імпровізація columns. Submitting from here (via the final wizard step) successfully created both the competition **and** saved a new reusable category template ("E2E Wizard Template" appeared correctly afterwards under `/category-templates`).

**TC-WIZ-105 — Age category without从/до range shows "undefined–undefined" (P2 — BUG-5, confirmed FAIL)**
Steps: in the manual category builder, add a value to "Вік" (e.g. "Дорослі") without filling the numeric "від"/"до" fields, generate nominations.
**Actual (Observed live):** the generated nomination is labeled `Дорослі (undefined–undefined)` in the on-screen list. **FAIL** — should either require the range or omit it cleanly from the label.

**TC-WIZ-106 — Required-field validation on step 1 (P1)**
Not fully isolated live (all fields were filled in the happy path) — **verify** each of Назва/Опис/Дата початку/Місце/Організатор/Реєстрація з/до individually blocks "Далі" when empty, and what (if any) message is shown, given the demonstrated pattern of silent failures elsewhere (REG-102).

**TC-WIZ-107 — Banner upload (P2)**
Not verified live — "Перетягніть банер конкурсу" drag-and-drop control was present but not exercised.

**TC-WIZ-108 — "Скасувати" / browser back mid-wizard (P2)**
Not verified live — confirm whether partially entered data is discarded without confirmation (risk of silent data loss for a long 7-step form).

---

## 12. COMPETITION EDIT — `/competitions/:id/edit`

**TC-CEDIT-001 — Edit link only shown to the owner (P1)**
**Observed live**: "Редагувати" link (→ `/competitions/:id/edit`) appears on the Деталі tab only for the account that created the competition; absent for other authenticated accounts viewing the same competition (consistent with the ownership model uncovered in CDET-201..204).

**TC-CEDIT-002 — Edit form and save flow (P1)**
Not exercised live in this session (time-boxed) — **verify** the edit form is pre-filled with existing data, that partial edits save correctly, and specifically **whether non-owners can reach `/competitions/:id/edit` by typing the URL directly** and what happens if they submit (given CDET's pattern of non-owner GETs returning 403 without a clear UI message, the same should be checked for this PUT/PATCH).

**TC-CEDIT-003 — Logged-out access is correctly blocked (P0)**
**Observed live**: `/competitions/:id/edit` while logged out redirects to `/login`. Correct (contrast with BUG-1's Apply page).

**TC-CEDIT-101 — "Видалити" (Delete) confirmation and effect (P1)**
Not exercised live (destructive, deliberately not run against real data in this session) — **verify** a confirmation step exists before delete, and that a deleted competition is actually removed / no longer reachable at its old URL.

---

## 13. CATEGORY TEMPLATES — `/category-templates`, `/new`, `/:id/edit`

**TC-CTPL-001 — List page (P1)**
**Observed live**: heading "Шаблони категорій", "Створити шаблон" button, filter tabs "Усі"/"Мої"/"Публічні", and either a list or the empty state "Шаблонів не знайдено. Змініть запит або створіть новий шаблон."

**TC-CTPL-002 — Any authenticated role can view and create templates (P1 — authorization gap)**
**Observed live as PARTICIPANT**: `GET /category-templates` → `200`, list renders normally; the "Створити шаблон" flow is fully reachable and **not blocked by role** — a PARTICIPANT attempting to POST a template was rejected only by an unrelated validation bug (BUG-4), not by a `403`. This means template creation currently has no role restriction, unlike judges/venues/entries.

**TC-CTPL-101 — Manual template creation fails with a raw backend error when using only a "Стиль" value (P2 — BUG-4, confirmed FAIL)**
Steps: `/category-templates/new` → name the template → add one value under "Стиль" only → "Згенерувати номінації" (shows "буде 1 номінація", 1 nomination row appears) → "Створити шаблон".
**Actual (Observed live):** `POST /categories/bulk` → `400`; the UI displays the raw response verbatim at the top of the form: *"categories.0.type must be one of the following values: age, level, direction, discipline, participants_count"*. **FAIL** — both a functional bug (Style-only templates cannot be created) and a UX bug (raw validator internals leaked to the end user).

**TC-CTPL-102 — Empty-template guard (P1, correct behavior)**
**Observed live**: clicking "Створити шаблон" before generating any nominations is correctly blocked client-side with: *"Згенеруйте номінації — шаблон не може бути порожнім."* — no request sent. Good example of the validation-with-feedback pattern that REG-102/APPLY-103 should also follow.

**TC-CTPL-103 — Successful creation via "Вік" category (P0, contrast/happy path)**
**Observed live** (through the wizard's inline template builder, functionally identical form): naming a template and generating nominations from an "Вік" value succeeds end-to-end and the template subsequently appears correctly under `/category-templates`.

**TC-CTPL-104 — Public vs. Private visibility toggle (P2)**
**Observed live**: "Приватний"/"Публічний" buttons are present on the template form; not exercised — **verify** a Публічний template from one account is actually visible/selectable by a different account (the wizard's template picker mentions "з ваших або публічних шаблонів").

**TC-CTPL-105 — Edit an existing template (`/category-templates/:id/edit`) (P2)**
Not verified live in this session.

**TC-CTPL-106 — Add a "special category" (P2)**
"Додати спеціальну категорію" button observed present, not exercised live.

---

## 14. COMPETITION TEAM (co-admins) — `/competitions/:id/team`

**TC-TEAM-001 — Team page for a competition with a single manager (P1)**
**Observed live**: heading "Команда конкурсу", subtitle with competition name and dates, message "Поки що ви єдина людина, яка керує конкурсом" (you're currently the only person managing this competition), "+ Додати адміна" button.

**TC-TEAM-002 — "Додати адміна" invite modal (P1)**
**Observed live**: opens a modal "Додати адміна" with Email\*, ПІБ (full name, with helper text "щоб бачити, хто це, до прийняття запрошення" — full name is shown before the invite is accepted so you can recognize who it is), and "Надіслати запрошення" button.

**TC-TEAM-101 — Invite email delivery (P1 — cannot be fully verified live)**
**Not verified live**: this environment has no `GMAIL_USER`/`GMAIL_APP_PASSWORD` configured, so — by the same mechanism confirmed for judges in JUDGE-102/BUG-6 — any invite sent here is almost certainly silently un-deliverable too. **Verify** (a) whether the team-invite flow shows the admin any equivalent of a fallback (link/code) when email fails, since the Judges flow does not, and (b) the accept-invite flow itself end-to-end in an environment with working email.

**TC-TEAM-001 (access) — Non-owner / logged-out access (P0)**
**Observed live**: `/competitions/:id/team` while logged out redirects to `/login` (correct, contrast with BUG-1). **Not verified live** whether a logged-in non-owner can reach this page directly by URL and what they'd see (recommend testing given the CDET-201..203 pattern).

---

## 15. JUDGES — management (competition tab) + Judge Cabinet (`/judge`)

### 15.1 Management (as competition owner)

**TC-JUDGE-001 — Add a judge (P0, happy path)**
**Observed live** (via direct API against an owned competition, mirroring what the "Додати" button on the Судді tab does): `POST /competitions/:id/judges` with `{name, email}` → `201`, returns `{id, name, email, venueId:null, addedAt, tempPassword, emailSent:false}`.

**TC-JUDGE-002 — Added judge appears in the Судді tab list (P0)**
**Observed live**: after adding, the tab shows a row "E2E Judge — e2e.judge.df@example.com" with a "Видалити" action; the empty state and "Додати" form (Ім'я судді / Email судді) are both present and functional.

**TC-JUDGE-101 — Temp password is never surfaced in the UI (P1 — BUG-6, confirmed FAIL)**
As above: the API response contains a real, working `tempPassword`, but neither the "Додати" success state nor the judge row in the list displays it anywhere. Combined with `emailSent:false` in this environment, **the admin has no UI-accessible way to actually onboard a judge here.** **Verify in an environment with real email configured** whether the email itself is the only intended delivery channel, and if so, consider whether the UI should show a fallback (e.g. "copy password") when `emailSent` is `false`.

**TC-JUDGE-102 — Remove a judge (P2)**
"Видалити" action observed present on each judge row; not exercised live.

### 15.2 Judge Cabinet — `/judge`

**TC-JUDGE-201 — Judge login (P0, happy path)**
**Observed live**: `/judge` shows its own, separate login form — "КАБІНЕТ СУДДІ" / "Вхід" / "Використайте email і тимчасовий пароль, які надіслав організатор." with Email + Пароль fields (entirely separate from `/login` and `/auth/*` — this matches the architecture noted in the existing login-flow-test-plan.md). Logging in with the judge's email + the `tempPassword` obtained via JUDGE-001 **succeeded live**, landing on a dashboard showing the competition name, "Суддя: <name>", a "Вийти" button, and (since this competition had no entries at the time) "Заявок на цей конкурс ще немає."

**TC-JUDGE-202 — Judge sees only their assigned competition (P1)**
Consistent with the login page's own copy ("має доступ лише до цього конкурсу"). **Not independently verified live** with a judge assigned to multiple competitions or attempting to access another competition's judge data.

**TC-JUDGE-203 — Scoring an entry, 1–10 range (P1)**
Not verified live — no entries existed in the judge's assigned competition at test time in a state ready for scoring. **Verify**: score input accepts only 1–10, rejects out-of-range/non-numeric input, and that submitted scores appear correctly wherever aggregated (Заявки tab "За балом" sort option, seen in CDET-203, implies scores feed that sort).

**TC-JUDGE-204 — Judge login with wrong/expired temp password (P2)**
Not verified live.

**TC-JUDGE-205 — First-login password change / temp-password expiry (P2)**
The login page's copy ("Пароль дійсний для першого входу" in the (unsent) email text found in `mail.service.ts`) implies the temp password is meant to be single-use, but no forced password-change step was observed on first Judge Cabinet login in this session. **Verify** whether the temp password can be reused indefinitely (potential security concern if so) or is actually invalidated after first use.

---

## 16. CROSS-ROLE AUTHORIZATION MATRIX

Consolidates the authorization findings scattered through the sections above into one matrix, plus the direct-API findings that establish root cause.

**TC-AUTHZ-001 — Route-level guard when logged out (P0)**
**Observed live**, correctly redirect to `/login` when logged out: `/dashboard`, `/competitions/new`, `/competitions/:id/edit`, `/competitions/:id/team`, `/category-templates`, `/category-templates/new`.
**Observed live, does NOT redirect (renders normally) when logged out**: `/`, `/competitions/:id` (renders `PublicCompetitionPage`), `/apply` (shows its own "choose a competition" explainer), `/judge`, `/login`, `/register`.
**Observed live, INCORRECTLY redirects when logged out (BUG-1)**: `/competitions/:id/apply`.

**TC-AUTHZ-002 — Role-level guard once logged in, backend-enforced (P1)**
**Observed live**: `GET /competitions/:id/judges`, `/venues`, and `/entries` return `403` for any account that isn't that competition's owner/team-member — confirmed for both a PARTICIPANT and a second, unrelated ADMIN self-registered account, against the same pre-existing competition. This is correctly enforced **on the backend**; the gap is entirely in how the frontend surfaces (or fails to surface) that `403` — see BUG-2.

**TC-AUTHZ-003 — Role-level guard once logged in, NOT enforced (P1)**
**Observed live, no role restriction found** (any authenticated role, including PARTICIPANT, succeeds): `GET /competitions` (dashboard's list — returns every competition system-wide), `GET/POST /category-templates`, `GET /competitions/:id` (detail), `GET /competitions/:id/nominations` (works even fully unauthenticated).

**TC-AUTHZ-101 — Self-registration as ADMIN bypasses the UI's role restriction entirely (P0, security — SEC-1, confirmed FAIL)**
Steps: with no session and no prior admin approval, call `POST /auth/register` directly with `{"role":"ADMIN","name":"...","email":"...","password":"..."}`.
Expected: rejected — Admin accounts should require some form of invite, secret, or approval by an existing admin, matching the fact that the `/register` UI deliberately hides this option.
**Actual (Observed live):** `201`, immediate valid `accessToken`/`refreshToken` for a brand-new, fully-privileged ADMIN account, and it works to log in via the UI afterward (verified — see Test Data table). **FAIL — this is a genuine privilege-escalation-by-design gap**, since the DTO (`backend/src/auth/dto/register.dto.ts`) explicitly documents `role: ADMIN` as a valid, supported registration path with no additional guard visible in this flow.

**TC-AUTHZ-102 — Ownership, not role, gates competition management (P1, confirmed pattern)**
**Observed live**: a fresh ADMIN account could **not** view Судді/Майданчики/Заявки for a competition it didn't create (`403`s as in AUTHZ-002), but **could** view/manage those same tabs perfectly normally on a competition it created itself (CDET-204). This confirms competition-management authorization is **ownership-scoped**, not simply role-scoped — worth stating explicitly since it's easy to mis-design tests assuming "ADMIN can always do everything."

---

## 17. NAVIGATION & EDGE CASES

**TC-NAV-001 — Back/forward browser navigation across the wizard (P2)**
Not verified live — see WIZ-108.

**TC-NAV-002 — Deep-linking to a specific wizard step or template edit id that doesn't exist (P2)**
Not verified live for `/category-templates/:id/edit` or `/competitions/:id/team` etc. with a bogus id — CDET-205 confirms the competition-detail route handles a bogus id gracefully; **verify the same for every other `:id` route** (edit, team, apply, category-template edit).

**TC-NAV-003 — Theme toggle persistence (P2)**
**Observed live**: a dark/light theme toggle button (top-right on every page) works and visibly changes the whole app's theme; not verified whether the choice persists across reloads/sessions.

**TC-NAV-004 — Header links are consistent across all authenticated pages (P1)**
**Observed live**: "Конкурси" (→ `/dashboard`) and "Шаблони категорій" (→ `/category-templates`) appear in the header on every authenticated page seen in this session (dashboard, competition detail, wizard, category templates, team) — consistent navigation chrome, no dead ends observed.

**TC-NAV-005 — Unknown route (404) (P2)**
Not verified live — `App.tsx`'s `<Routes>` has no catch-all route; **verify** what actually renders for a path matching none of the defined routes (React Router default is a blank page with no `<Route>` matched — likely worth an explicit 404 page).

---

## 18. UI / UX / Accessibility observations

- Role tabs on `/login` and `/register` are implemented with proper `role="tab"`/`aria-selected` semantics (**Observed live** via the accessibility tree) — good baseline accessibility.
- Several silent-failure patterns were found (REG-102, and the empty-with-no-error rendering in CDET-201..203) — from an accessibility/UX standpoint these are doubly bad, since there's nothing for a screen reader to announce either.
- BUG-4's raw validator string leaking into the UI is also an i18n gap — the rest of the app is fully Ukrainian, but that one error string is untranslated English straight from `class-validator`.
- Toast notifications (seen for the Судді tab failure) appear briefly at the bottom of the viewport — verify timing is sufficient and that they're announced to assistive tech.

## 19. Security Observations Summary (for dev team follow-up)

1. **SEC-1 / AUTHZ-101 (P0):** Anonymous ADMIN self-registration via the API — the single most important finding in this session. Recommend an invite-token or existing-admin-approval requirement on `role: ADMIN` registrations, enforced server-side, not just hidden client-side.
2. **BUG-1 (FIXED 2026-09-02):** The Apply page's incorrect login requirement, which broke the product's advertised no-signup flow, has been fixed — the stray frontend auth gate is removed and anonymous submission is re-verified live. SEC-1 below stems from the same theme (frontend auth checks not matching backend/product intent) and remains open.
3. **BUG-2 (P1):** 403s silently swallowed into empty states could mask real authorization bugs from both users and QA in the future (an empty list looks identical whether it's "no data" or "access denied") — recommend the frontend distinguish these explicitly.
4. **BUG-6 (P1):** Judge/Team invite flows have no fallback when email delivery is unavailable/misconfigured — worth a UI affordance (e.g. "copy invite link/password") for admins in that situation, not just in dev.

## 20. Traceability Summary

| Feature | Test cases | P0 | P1 | P2 |
|---|---|---|---|---|
| Registration | REG-001..005, 101..106, 201 | 3 | 4 | 4 |
| Home | HOME-001..004 | 2 | 1 | 1 |
| Competition Detail | CDET-001..205 | 4 | 6 | 1 |
| Apply / Entries | APPLY-001..106 | 3 | 3 | 2 |
| Dashboard | DASH-001..007 | 3 | 1 | 3 |
| Wizard | WIZ-001..108 | 2 | 5 | 3 |
| Competition Edit | CEDIT-001..101 | 1 | 3 | 0 |
| Category Templates | CTPL-001..106 | 1 | 3 | 3 |
| Team | TEAM-001..101 | 1 | 3 | 0 |
| Judges | JUDGE-001..205 | 2 | 3 | 3 |
| Authorization Matrix | AUTHZ-001..102 | 2 | 3 | 0 |
| Navigation | NAV-001..005 | 0 | 1 | 4 |
| **Total** | **~95 cases** | **24** | **36** | **24** |

Cross-reference: Login/session mechanics — see `specs/login-flow-test-plan.md` (TC-LOGIN-001 through 112).
