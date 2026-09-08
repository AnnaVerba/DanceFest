# Global auth guard + closed-by-default API

**Date:** 2026-09-08
**Status:** implemented & verified (API-level) 2026-09-08

## Problem

The API is open by default: guards are opt-in per route via `@UseGuards(JwtAuthGuard)`.
Sixteen controllers mix public reads with protected writes, and it is easy to add a
new route and forget the guard. We want the inverse: **every route requires a token
unless explicitly marked public**, and the public set is exactly what a logged-out
visitor actually sees on the site.

## Part A — Global guard

### Mechanism

| File | Contents |
|---|---|
| `backend/src/auth/is-public.constant.ts` | `export const IS_PUBLIC_KEY = 'isPublic';` |
| `backend/src/auth/public.decorator.ts` | `export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);` |
| `backend/src/auth/global-jwt-auth.guard.ts` | `GlobalJwtAuthGuard extends JwtAuthGuard`; `canActivate(ctx)` returns `true` when `reflector.getAllAndOverride(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()])` is truthy, otherwise `super.canActivate(ctx)`. |

Registered in `AuthModule` providers as `{ provide: APP_GUARD, useClass: GlobalJwtAuthGuard }`.

### Interaction with existing guards

- Existing per-route `@UseGuards(JwtAuthGuard)` are now redundant but harmless — **left in
  place** to keep the diff reviewable. Optional later cleanup.
- `MinLevelGuard` routes keep working: global guards run before route guards, so
  `request.user` is populated before `MinLevelGuard` reads it.
- **Judges** authenticate with a separate `JudgeAuthGuard`. A global `JwtAuthGuard`
  would reject a judge token, so the `judges` auth controller
  (`judges/judges-auth.controller.ts`) is annotated `@Public()` at class level; its
  own `JudgeAuthGuard` still protects `/judges/me*`.

### Swagger

`main.ts` `DocumentBuilder` gains `.addSecurityRequirements('bearer')` so the whole doc
shows locked by default. `@Public()` routes keep no padlock.

### `@Public()` set

Everything not listed here requires a token.

- Auth flow: `POST /auth/register`, `/auth/login`, `/auth/otp/verify`,
  `/auth/otp/resend`, `/auth/refresh`, `/auth/logout`. `GET /auth/me` stays protected.
- `POST /judges/login` (class-level `@Public()` on the judges auth controller).
- `GET /` (health).
- `GET /competitions`, `GET /competitions/years`, `GET /competitions/:id`.
- `GET /competitions/:id/entries/count`.
- `GET /competitions/:id/venues`.
- `GET /competitions/:id/program`.
- `GET /competitions/:id/payment-details` (explicit call — anon frontend does not fetch
  it today, but it is wanted public for the public competition page).

Now token-only (were open): `GET /competitions/:id/entries`, `.../nominations`,
`.../rules`, `.../duration-limits`, `.../overlimit-tariffs`, `GET /schools`,
`GET /schools/:id`, `POST /schools`, and every write.

## Part B — Move the coach's school out of registration

`/complete-profile` already collects the school for coaches
(`CompleteProfilePage.tsx` renders `<SchoolPicker>`, `CompleteProfileDto` accepts
`schoolId`, `profile-completeness.ts` requires `schoolId && coachId` for a COACH,
`RequireCompleteProfile` gates it). Registration only *also* asks because of one
leftover check.

### Changes

- `backend/src/auth/auth.service.ts`: remove the
  `dto.role === AccessLevel.COACH && !dto.schoolId` → `BadRequestException` throw.
  `schoolId` at register becomes `dto.schoolId ?? null` in both the link-registration
  and create branches (still accepted if a client sends it, no longer required).
- `frontend/src/pages/RegisterPage.tsx`: remove `<SchoolPicker>`, its `schoolId`
  state, and `schoolId` from the `register()` payload.
- `frontend/src/lib/schools.ts`: `searchSchools`, `getSchool`, `createSchool` switch
  from plain `fetch` to `authorizedFetch` — they are now only called from the authed
  `/complete-profile` page and coach cabinet, and the endpoints require a token.
- No change to `CompleteProfilePage`, `CompleteProfileDto`, `SchoolPicker`,
  `profile-completeness.ts`, or `users.service` — already built for this.

`SCHOOL_REQUIRED_FOR_COACH_MESSAGE` stays: `users.service` still uses it when a coach
completes their profile without a school.

## e2e updates (done)

- `e2e/src/pages/register.page.ts`: dropped `createSchoolInline` + `fillParticipantFields`
  (birth date folded into `fillCommonFields`); `passProfileCompletionGate` now creates the
  school on `/complete-profile` for a COACH before the mentor step.
- `otp-first-login.spec.ts`, `coach-applications.spec.ts`, `venue-access.spec.ts`: the
  two school lines moved from the register form to `/complete-profile`; the SchoolPicker
  "Додати" button is matched with `exact: true` (MentorCoachPicker's "Додати нового" is
  on the same page).
- `complete-profile.spec.ts`: `createSchool(request, token)` sends a bearer token
  (POST /schools is now protected); `registerCoach` no longer pre-creates a school.
- Full Playwright suite: 52 passed (the 4 `test.fail()` known-bugs still fail as expected).

## Follow-up

- Cleanup of now-redundant per-route `@UseGuards(JwtAuthGuard)`.

## Verification

1. Backend compiles clean, Nest starts.
2. Anonymous: `GET /competitions` → 200; `GET /competitions/:id/nominations` → 401;
   `GET /auth/me` → 401; `POST /auth/login` reachable.
3. `POST /auth/register` with `role: COACH` and no `schoolId` → 201.
4. Frontend compiles; `/register` renders with no school field; a freshly registered
   coach lands on `/complete-profile` with the school picker present.
5. Swagger `/docs` loads and shows the Authorize button / locked routes.
