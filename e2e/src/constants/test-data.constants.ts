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
