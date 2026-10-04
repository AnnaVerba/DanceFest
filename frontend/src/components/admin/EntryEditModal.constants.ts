import type { PaymentMethod } from '../../lib/entryEdit.types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Готівка',
  card: 'Картка',
};

// The select value for "no payment method chosen".
export const NO_PAYMENT_METHOD = '';

export const ENTRY_LOAD_FAILED_MESSAGE = 'Не вдалося завантажити заявку.';
export const ENTRY_SAVE_FAILED_MESSAGE = 'Не вдалося зберегти заявку.';
export const PARTICIPANT_SEARCH_FAILED_MESSAGE = 'Не вдалося виконати пошук.';
// Nominations are searched by name — a competition can hold thousands.
export const NOMINATION_SEARCH_MIN_CHARS = 2;
export const NOMINATION_SEARCH_DEBOUNCE_MS = 300;
export const NOMINATION_LABEL = 'Номінація';
export const NOMINATION_NONE = '—';
export const NOMINATION_SEARCH_PLACEHOLDER =
  'Почніть вводити назву номінації, щоб змінити…';
export const NOMINATION_SEARCHING_LABEL = 'Пошук…';
export const NOMINATION_NOT_FOUND_LABEL = 'Нічого не знайдено.';
export const ROUTINE_NAME_REQUIRED_MESSAGE = 'Вкажіть назву номеру';
export const MUSIC_LABEL = 'Музика';
export const MUSIC_REPLACE_LABEL = 'Змінити';
export const MUSIC_ADD_LABEL = 'Додати';
export const MUSIC_UPLOADING_LABEL = 'Завантаження…';
export const MUSIC_NONE = '—';
export const MUSIC_UPLOAD_FAILED_MESSAGE = 'Не вдалося зберегти музику.';

// Похідне від стилю номінації — редагувати тут нема чого.
export const IMPROVISATION_ENTRY_NOTE = 'Імпровізація (за стилем номінації)';
