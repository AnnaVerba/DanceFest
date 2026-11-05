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
export const MUSIC_LABEL = 'Музика';
export const MUSIC_REPLACE_LABEL = 'Змінити';
export const MUSIC_ADD_LABEL = 'Додати';
export const MUSIC_UPLOADING_LABEL = 'Завантаження…';
export const MUSIC_NONE = '—';
export const MUSIC_UPLOAD_FAILED_MESSAGE = 'Не вдалося зберегти музику.';

// Похідне від стилю номінації — редагувати тут нема чого.
export const IMPROVISATION_ENTRY_NOTE = 'Імпровізація (за стилем номінації)';

export const PARTICIPANTS_LINEUP_HINT =
  'Визначається автоматично за кількістю обраних учасників.';

export const NOMINATION_REQUIRED_MESSAGE =
  'Оберіть номінацію зі списку під новий вибір ліги, віку чи стилю.';
export const AMOUNT_LABEL = 'Сума до сплати';
export const PARTICIPANTS_LABEL = 'Учасники';
