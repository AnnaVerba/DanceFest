/** Shared password for every account these tests register. Meets MIN_PASSWORD_LENGTH (6). */
export const E2E_TEST_PASSWORD = 'TestPass123!';

/**
 * The pre-existing seeded competition every run can rely on read-only
 * (backend/seeders). Owned by the seeded "Test" admin, not by any account
 * these tests create — that ownership mismatch is exactly what BUG-4 exploits.
 */
export const SEEDED_COMPETITION = {
  ID: '71f219ab-ac0a-4073-8080-64089d455d81',
  NAME: 'BE-9 Smoke Test',
  OWNER_DISPLAY_NAME: 'Test',
} as const;

/**
 * The only ADMIN account this environment provides: seeded via
 * `backend/seeders/20260822090000-mock-admin.ts` (run once with `npm run seed`
 * inside the backend container — not part of the app's normal migrate-on-boot).
 * There is no self-registration path for ADMIN, so tests that need one log in
 * with this account rather than creating a fresh one.
 */
export const SEEDED_ADMIN_ACCOUNT = {
  EMAIL: 'mock@dansefest.local',
  PASSWORD: 'mock1234',
} as const;

/**
 * A registration window that is open "now" (relative to the app's current
 * date, 2026-09-03) and a competition window safely after it — used by the
 * wizard spec so the resulting competition is immediately open for
 * applications without depending on the real calendar date drifting.
 */
export const OPEN_COMPETITION_DATES = {
  REGISTRATION_FROM: '2026-09-01',
  REGISTRATION_TO: '2026-09-10',
  DATE_FROM: '2026-09-15',
  DATE_TO: '2026-09-16',
} as const;
