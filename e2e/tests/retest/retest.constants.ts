/** Re-test of BUG-01…TASK-14 (docs/bahy-ta-zadachi-v2.md) against the local dev app. */

export const ADMIN_PHONE = process.env.E2E_ADMIN_PHONE ?? '';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? '';

/** The competition Developer picked as the test ground. */
export const RENO_CLUB = {
  ID: '062857b6-5056-4ed5-a7a0-878897a2e8ea',
  VENUE_A: '1ca44aca-b69f-4b41-aeec-4ef9348ec519',
  VENUE_A_NAME: 'А',
  VENUE_B: '5b209a12-f0fd-456e-b642-82575019fed8',
  VENUE_B_NAME: 'И',
  DAY_2_ID: 'c638aef1-de61-4bd7-a7d7-dd040abb0cf3',
  DAY_2_LABEL: '2026-09-20',
  // «Дует · Ветерани · Дебют · гонка» and its only entry (№4).
  NOMINATION_A: 'ef88ed27-f868-4652-90f6-3a71ac7af494',
  ENTRY_A: 'a768a9b7-815b-461d-9200-81be1b96c5f6',
  // «Дует · Мастер · Дебют · гонка» and its only entry (№5).
  NOMINATION_B: '0e745505-e864-4ee0-bec8-53f624d9ba56',
  NOMINATION_B_NAME: 'Дует · Мастер · Дебют · гонка',
  ENTRY_B: 'cd0f7369-eec5-44f1-8d2a-2416edea421e',
  // A duo (entry №7) that is in neither nomination above — the late entry.
  LATE_DUO: ['702738b4-4f9d-413c-b93c-ecb27235f8df', '659b499d-b193-4263-ae1d-38bcb9cf62a2'],
} as const;

/** A competition the admin does not own (seeded mock admin is its owner). */
export const FOREIGN_COMPETITION = {
  ID: '22222222-2222-4222-8222-222222222222',
  NAME: 'Перлина Сходу 2026',
} as const;

export const LEAGUE_PRO = 'ПРОФІ';
export const LEAGUE_DEBUT = 'Дебют';
export const STYLE_DRIFT = 'дріфт';
export const AGE_VETERANS = 'Ветерани';
export const LINEUP_DUO = 'Дует';
export const AGE_WITH_RANGE = { NAME: 'суппер', FROM: 56, TO: 89 } as const;

export const PRO_SECONDS = 120;
export const PRO_SECONDS_CHANGED = 100;
export const DEBUT_SECONDS = 90;
export const MANUAL_SECONDS = 180;

export const E2E_PREFIX = 'E2E';
export const BIG_TEMPLATE_MIN_NOMINATIONS = 1000;
export const EXPRESS_DEFAULT_JSON_LIMIT_BYTES = 100 * 1024;
export const SPECIAL_MODAL_VIEWPORTS = [375, 768, 1280, 1920] as const;
export const VIEWPORT_HEIGHT = 900;
export const MIN_AGE_NAME_INPUT_WIDTH_PX = 150;
// A one-line text field; anything taller means a flex-basis landed on height.
export const MAX_SINGLE_LINE_INPUT_HEIGHT_PX = 60;
