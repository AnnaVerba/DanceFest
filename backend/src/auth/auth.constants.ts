export const SALT_ROUNDS = 10;
export const DEFAULT_REFRESH_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30;

export const MIN_PASSWORD_LENGTH = 6;

export const INVALID_CREDENTIALS_MESSAGE = 'Невірний email, пароль або роль';
export const ROLE_MISMATCH_MESSAGE = 'Роль користувача не відповідає вказаній';
export const INSUFFICIENT_ROLE_MESSAGE = 'Ця дія недоступна для вашої ролі';
export const EMAIL_OR_PHONE_TAKEN_MESSAGE =
  'Користувач з таким email або телефоном вже існує';
export const REFRESH_TOKEN_REVOKED_MESSAGE =
  'Refresh-токен відкликаний або вже використаний';
export const LEAGUE_NOT_ALLOWED_ON_REGISTER_MESSAGE =
  'Лігу не можна вказувати при реєстрації';
export const ADMIN_SELF_REGISTRATION_FORBIDDEN_MESSAGE =
  'Самостійна реєстрація адміністратора недоступна — новий обліковий запис адміністратора може створити лише інший адміністратор.';
