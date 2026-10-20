import { SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS } from '../lib/schools.constants';

export const STUDIO_HEAD_LABEL = 'Керівник';
export const STUDIO_HEAD_PLACEHOLDER = 'Почніть вводити імʼя керівника';
export const STUDIO_HEAD_CHANGE_LABEL = 'Змінити';
export const STUDIO_HEAD_TOO_SHORT_HINT = `Введіть щонайменше ${SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS} символи.`;
export const STUDIO_HEAD_SEARCHING_LABEL = 'Пошук…';
export const STUDIO_HEAD_NOT_FOUND_LABEL =
  'Керівника не знайдено. Перевірте імʼя або оберіть студію нижче.';
// Typing waits this long after the last keystroke before it searches.
export const STUDIO_HEAD_SEARCH_DEBOUNCE_MS = 250;
