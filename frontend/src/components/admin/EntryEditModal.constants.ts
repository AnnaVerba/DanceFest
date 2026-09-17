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
export const ROUTINE_NAME_REQUIRED_MESSAGE = 'Вкажіть назву номеру';
