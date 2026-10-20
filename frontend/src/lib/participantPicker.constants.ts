import { PARTICIPANT_SEARCH_MIN_CHARS } from './participants.constants';

export const PARTICIPANTS_LABEL = 'Учасники';
export const PARTICIPANT_SEARCH_PLACEHOLDER =
  'Почніть вводити прізвище учасника…';
export const PARTICIPANT_SEARCH_TOO_SHORT_HINT = `Введіть щонайменше ${PARTICIPANT_SEARCH_MIN_CHARS} літери.`;
export const PARTICIPANT_SEARCHING_HINT = 'Пошук…';
export const PARTICIPANT_SEARCH_FAILED_MESSAGE = 'Не вдалося виконати пошук.';
export const PARTICIPANT_NOT_FOUND_LABEL = 'Нікого не знайдено.';
// Passed as the hint to show none at all.
export const NO_HINT = '';
export const PARTICIPANTS_DEFAULT_HINT =
  'Оберіть одного для сольного номера, двох чи трьох — для дуо й тріо.';

export const NEW_PARTICIPANT_LINK_LABEL =
  '+ Немає потрібного учасника — створити';
export const NEW_PARTICIPANT_TITLE = 'Новий учасник';
export const NEW_PARTICIPANT_FIRST_NAME_PLACEHOLDER = 'Імʼя';
export const NEW_PARTICIPANT_LAST_NAME_PLACEHOLDER = 'Прізвище';
export const NEW_PARTICIPANT_PHONE_PLACEHOLDER = '+380 63 700 10 11';
export const NEW_PARTICIPANT_COACH_PLACEHOLDER = 'Керівник — необовʼязково';
export const NEW_PARTICIPANT_SUBMIT_LABEL = 'Додати й обрати';
export const NEW_PARTICIPANT_CANCEL_LABEL = 'Скасувати';

export const NEW_PARTICIPANT_NAME_REQUIRED_MESSAGE =
  'Вкажіть імʼя та прізвище.';
export const NEW_PARTICIPANT_PHONE_REQUIRED_MESSAGE = 'Телефон обовʼязковий.';
export const NEW_PARTICIPANT_BIRTH_DATE_REQUIRED_MESSAGE =
  'Вкажіть дату народження.';
export const NEW_PARTICIPANT_FAILED_MESSAGE = 'Не вдалося створити учасника.';
