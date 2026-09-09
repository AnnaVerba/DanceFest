// A birth date must be a real calendar date in "YYYY-MM-DD" form, not in
// the future, and inside a human range. Age drives competition
// eligibility, so an out-of-range value is a correctness bug, not just
// untidy input.
export const MIN_BIRTH_YEAR = 1900;
export const MAX_AGE_YEARS = 120;

export const BIRTH_DATE_INVALID_MESSAGE =
  'Дата народження має бути у форматі РРРР-ММ-ДД';
export const BIRTH_DATE_IN_FUTURE_MESSAGE =
  'Дата народження не може бути в майбутньому';
export const BIRTH_DATE_OUT_OF_RANGE_MESSAGE = `Вкажіть коректну дату народження (не раніше ${MIN_BIRTH_YEAR} року)`;
