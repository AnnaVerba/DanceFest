export const NOMINATION_REQUIRED_MESSAGE = 'Вкажіть номінацію';
export const ENTRY_NOT_FOUND_MESSAGE = 'Заявку не знайдено';
export const ENTRY_CREATE_FAILED_MESSAGE = 'Не вдалося створити заявку';
export const MAX_ENTRY_NUMBER_ASSIGNMENT_ATTEMPTS = 2;
export const ROUTINE_NAME_REQUIRED_MESSAGE =
  'Вкажіть назву номеру або учасника';
export const NOT_OWN_PARTICIPANT_MESSAGE = 'Цей учасник не закріплений за вами';
export const COMPETITION_OVER_APPLY_MESSAGE =
  'Конкурс завершено — подання заявок закрите.';
export const REGISTRATION_CLOSED_APPLY_MESSAGE =
  'Реєстрацію на цей конкурс закрито.';
// One dancer performs in a nomination once; the nomination name follows.
export const PARTICIPANT_ALREADY_IN_NOMINATION_MESSAGE =
  'Учасник уже виступає в номінації';
export const NOMINATION_PARTICIPANT_KEY_SEPARATOR = '|';
export const DEFAULT_ENTRIES_PAGE_SIZE = 50;
export const MAX_ENTRIES_PAGE_SIZE = 200;
// A running number lost to a concurrent submission is the only unique
// violation the insert transaction can clear by re-running: an Entry's own
// (competitionId, number), or a participant number's (competitionId,
// number). Every other unique violation — notably a person already numbered
// in this competition (competitionId, personId) — is final and must
// surface without a retry.
export const NUMBER_ALLOCATION_UNIQUE_INDEXES: readonly string[] = [
  'entries_competition_id_number_idx',
  'competition_participant_numbers_competition_number_unique',
];
// A single person's entries across every competition — years of history,
// still bounded.
export const MAX_MY_ENTRIES = 1000;

// An entry typed in by hand without dancers still puts one person on stage.
export const MIN_PARTICIPANTS_PER_ENTRY = 1;

// Public stats read every entry of one competition, capped for safety.
export const MAX_ENTRY_STATS_ROWS = 10000;
export const ENTRY_STATS_ATTRIBUTES: string[] = [
  'participantIds',
  'participantsCount',
  'studioName',
  'city',
  'nominationId',
  'nomination',
  'lineup',
];
// Changing the nomination of one exit of a per-program nomination needs a
// program the new nomination also has.
export const NOMINATION_PROGRAM_MISMATCH_MESSAGE =
  'У вибраній номінації немає програми цього виступу';

// The only purchasable extra-time brackets for an overrun performance (see
// PATCH .../entries/:entryId/extra-time).
export const EXTRA_TIME_SECONDS_OPTIONS = [30, 60] as const;
export type ExtraTimeSeconds = (typeof EXTRA_TIME_SECONDS_OPTIONS)[number];

// Money is kept to kopiykas: sums of DECIMAL(10,2) prices are rounded back
// to two decimals so float drift never shows up in a total.
export const MONEY_ROUNDING_FACTOR = 100;
