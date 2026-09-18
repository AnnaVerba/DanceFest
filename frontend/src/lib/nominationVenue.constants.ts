import type { VenueSummaryGroupBy } from './nominations.types';

// <select> values: nothing picked yet (or "any venue" in the filter), and
// "no venue" — the latter maps to venueId null on the wire.
export const NO_VENUE_CHOICE = '';
export const UNASSIGNED_VENUE_VALUE = 'none';

export const VENUE_FILTER_ARIA_LABEL = 'Фільтр за майданчиком';
export const VENUE_FILTER_ALL_LABEL = 'Майданчик: усі';
export const VENUE_UNASSIGNED_LABEL = 'Без майданчика';
export const VENUE_ROW_ARIA_LABEL_PREFIX = 'Майданчик номінації';

export const BULK_VENUE_ARIA_LABEL = 'Майданчик для обраних номінацій';
export const BULK_VENUE_PLACEHOLDER = 'Оберіть майданчик…';
export const BULK_VENUE_UNASSIGN_LABEL = 'Зняти з майданчика';
export const BULK_VENUE_SUBMIT_LABEL = 'Призначити на майданчик';
export const BULK_VENUE_SUBMITTING_LABEL = 'Призначення…';

export const DISTRIBUTION_TITLE = 'Розподіл номінацій';
export const DISTRIBUTION_HINT =
  'Відфільтруйте номінації, позначте потрібні галочками (або «Обрати всі відфільтровані») і призначте їх на майданчик.';
export const DISTRIBUTION_LOADING_LABEL = 'Завантаження...';
export const DISTRIBUTION_NO_NOMINATIONS_MESSAGE =
  'У конкурсі ще немає номінацій — створіть їх на вкладці «Номінації».';

export const QUICK_TITLE = 'Швидкий розподіл';
export const QUICK_HINT =
  'Призначте майданчик одразу всім номінаціям ліги чи вікової категорії. Номінації, які вже стоять на майданчику, не змінюються — хіба що позначите «Включно з уже розподіленими».';
export const QUICK_GROUP_BY_LEAGUE: VenueSummaryGroupBy = 'level';
export const QUICK_GROUP_BY_AGE: VenueSummaryGroupBy = 'age';
export const QUICK_GROUP_BY_LEAGUE_LABEL = 'По лігах';
export const QUICK_GROUP_BY_AGE_LABEL = 'По віку';
export const QUICK_INCLUDE_ASSIGNED_LABEL = 'Включно з уже розподіленими';
export const QUICK_ASSIGN_LABEL = 'Призначити';
export const QUICK_SELECT_ARIA_PREFIX = 'Майданчик для категорії';
export const QUICK_ASSIGN_ARIA_PREFIX = 'Призначити майданчик категорії';
export const SUMMARY_LOAD_ERROR_MESSAGE = 'Не вдалося завантажити зведення по майданчиках.';

export const VENUE_ASSIGN_ERROR_MESSAGE =
  'Не вдалося призначити майданчик. Спробуйте ще раз.';
export const NOMINATIONS_LOAD_ERROR_MESSAGE = 'Не вдалося завантажити номінації.';
