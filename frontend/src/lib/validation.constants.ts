// Mirrors the backend rule in common/validation/birth-date.constants.ts:
// a real date, not in the future, within a human age range.
export const MIN_BIRTH_YEAR = 1900;
export const MAX_AGE_YEARS = 120;

// For the native date input's `min` attribute.
export const MIN_BIRTH_DATE = `${MIN_BIRTH_YEAR}-01-01`;

export const NAME_MIN_LENGTH = 2;

export const EMAIL_INVALID_MESSAGE = 'Вкажіть коректний email';
export const PHONE_INVALID_MESSAGE =
  'Вкажіть номер телефону у міжнародному форматі';
export const NAME_INVALID_MESSAGE = "Вкажіть імʼя та прізвище";
export const BIRTH_DATE_INVALID_MESSAGE = 'Вкажіть коректну дату народження';
