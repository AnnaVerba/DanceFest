// E.164: a leading "+", a non-zero first digit, then 6-14 more digits
// (7-15 in total). The frontend already emits this shape via
// react-phone-number-input; the API must not trust that.
export const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export const PHONE_INVALID_MESSAGE =
  'Телефон має бути у міжнародному форматі, напр. +380501234567';
