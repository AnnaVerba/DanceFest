// Column headings of the entries table. Each cell repeats its heading as
// `data-label`, which the phone layout shows beside the value.
export const ENTRY_COLUMN_LABEL = {
  PARTICIPANT: 'Учасник',
  PARTICIPANT_NUMBERS: '№ учасника',
  NOMINATION: 'Номінація',
  MUSIC: 'Музика',
  PRICE: 'Вартість',
  MUSIC_FEE: 'Доплата за музику',
  AMOUNT: 'Разом',
} as const;

// Columns before PRICE, MUSIC_FEE and AMOUNT, the three the total row sums
// — how far its label cell spans.
export const ENTRY_COLUMN_COUNT_BEFORE_TOTALS =
  Object.keys(ENTRY_COLUMN_LABEL).length - 3;

export const ENTRY_TOTAL_LABEL = 'Разом';
export const ENTRY_PARTICIPANT_TOTALS_LABEL = 'Сума по учасниках';

export const MUSIC_UPLOAD_FAILED_TITLE = 'Музику не збережено';
export const MUSIC_UPLOAD_FAILED_MESSAGE = 'Не вдалося зберегти музику.';

// Page titles: a dancer's own, a trainer's dancers', and a studio head's —
// whose list also holds their trainers' entries.
export const MY_ENTRIES_TITLE = 'Мої заявки';
export const COACH_ENTRIES_TITLE = 'Заявки моїх учасників';
export const HEAD_ENTRIES_TITLE = 'Мої заявки та заявки моїх тренерів';
// A studio head's entries split into their own, then each trainer's.
export const HEAD_OWN_BLOCK_LABEL = 'Мої заявки';
export const TRAINER_BLOCK_LABEL_PREFIX = 'Заявки тренера';
export const UNNAMED_TRAINER_LABEL = 'Тренер';

// One page of «Мої заявки» — the server filters, sorts and pages it.
export const MY_ENTRIES_PAGE_SIZE = 20;
export const MY_ENTRIES_PAGER_LABEL = 'Сторінки заявок';
export const ENTRIES_NOT_FOUND_LABEL = 'Нічого не знайдено.';

// How long the search box waits after the last keystroke before asking.
export const MY_ENTRIES_SEARCH_DEBOUNCE_MS = 300;
export const ENTRIES_LOAD_FAILED_MESSAGE = 'Не вдалося завантажити заявки.';
// A competition the server sent without a name.
export const COMPETITION_FALLBACK_NAME = 'Конкурс';
