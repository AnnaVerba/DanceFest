export const ALL = '__all__';
export const PAGE_SIZE = 20;
// How many entries one server request pulls; "Показати ще" fetches the next
// batch and appends it so the in-panel filters keep working over the whole
// loaded set.
export const ENTRIES_SERVER_PAGE = 200;

// Columns always shown in the table header: №, № учасника, Назва номеру,
// Номінація, Вік. категорія, Ліга, Програма, К-сть уч., Студія, Хореограф,
// Бал. The "Дії" column adds one more when canManage. Used to span the
// "no matches" row across the full table width.
export const BASE_COLUMN_COUNT = 11;
export const ACTIONS_COLUMN_COUNT = 1;

export type SortKey = 'number' | 'name' | 'score';

export const SORT_LABELS: Record<SortKey, string> = {
  number: 'Сортувати за №',
  name: 'За назвою',
  score: 'За балом',
};
