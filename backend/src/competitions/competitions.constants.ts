export const COMPETITION_NOT_FOUND_MESSAGE = 'Конкурс не знайдено';
export const NO_COMPETITION_ACCESS_MESSAGE = 'Немає доступу до цього конкурсу';
export const COMPETITION_OWNER_ONLY_MESSAGE =
  'Цю дію може виконати лише власник конкурсу';
export const ORGANIZER_IDS_MISMATCH_MESSAGE =
  'Кожному організатору має відповідати один id (або порожній id)';
// Stands in `organizerIds` for an organizer name that has no account.
export const NO_ACCOUNT_ORGANIZER_ID = '00000000-0000-0000-0000-000000000000';
// The list search matches the organizers array joined into one string.
export const ORGANIZERS_SEARCH_SEPARATOR = ' ';
export const ORGANIZERS_COLUMN = 'Competition.organizers';
// The query is matched word by word, so «Анна Верба» also finds «Верба Анна».
export const SEARCH_WORDS_SEPARATOR = /\s+/;
// Values of the list's `status` filter, matching the catalog's chips.
export const COMPETITION_STATUS_FILTER = {
  REGISTRATION_OPEN: 'open',
  PLANNED: 'soon',
  FINISHED: 'finished',
} as const;
// Dates are stored without a time, so they compare as `YYYY-MM-DD`.
export const ISO_DATE_LENGTH = 10;
