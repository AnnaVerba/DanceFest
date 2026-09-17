export const SALT_ROUNDS = 10;
export const DEFAULT_ACCESS_EXPIRES_IN_SECONDS = 60 * 60;
export const DEFAULT_REFRESH_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

// Lower-cased: Express normalises header names to lower case on read.
export const DEVICE_ID_HEADER = 'x-device-id';

export const MIN_PASSWORD_LENGTH = 6;

export const PASSWORD_TOO_SHORT_MESSAGE = `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`;

export const INVALID_CREDENTIALS_MESSAGE = 'Невірний телефон, пароль або роль';
export const ROLE_MISMATCH_MESSAGE = 'Роль користувача не відповідає вказаній';
export const INSUFFICIENT_ROLE_MESSAGE = 'Ця дія недоступна для вашої ролі';
export const PHONE_TAKEN_MESSAGE = 'Користувач з таким телефоном вже існує';
export const REFRESH_TOKEN_REVOKED_MESSAGE =
  'Refresh-токен відкликаний або вже використаний';
export const FINGERPRINT_MISMATCH_MESSAGE =
  'Сесія прив’язана до іншого пристрою';
export const LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE =
  'Лігу не можна вказувати при реєстрації';
