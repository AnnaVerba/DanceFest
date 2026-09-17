export const MIN_PASSWORD_LENGTH = 6;
export const PASSWORD_TOO_SHORT_MESSAGE = `Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`;
export const PASSWORD_MISMATCH_MESSAGE = 'Паролі не збігаються';

// Mirrors PASSWORD_STRENGTH_REGEX in backend/src/auth/auth.constants.ts.
// Registration password: at least one letter (any alphabet), one digit and
// one special symbol — anything that is not a letter, digit or whitespace.
export const PASSWORD_STRENGTH_REGEX = /^(?=.*\p{L})(?=.*\d)(?=.*[^\p{L}\d\s]).*$/u;
export const PASSWORD_TOO_WEAK_MESSAGE =
  'Пароль має містити хоча б одну літеру, одну цифру та один спецсимвол';

export const SESSION_STORAGE_KEY = 'dansefest.session';
export const DEVICE_ID_STORAGE_KEY = 'dansefest.deviceId';
export const DEVICE_ID_HEADER = 'X-Device-Id';

export const UNEXPECTED_SERVER_RESPONSE_MESSAGE =
  'Сервер повернув неочікувану відповідь';
export const CANNOT_CONNECT_TO_SERVER_MESSAGE = "Не вдалося з'єднатися з сервером";
export const LOGIN_FAILED_MESSAGE =
  'Не вдалося увійти. Перевірте номер телефону та пароль.';
export const LEVEL_UPGRADE_FAILED_MESSAGE =
  'Не вдалося змінити рівень доступу.';
export const REGISTER_FAILED_MESSAGE =
  'Не вдалося зареєструватися. Спробуйте ще раз.';
export const NO_STORED_REFRESH_TOKEN_MESSAGE = 'Немає збереженого refresh-токена';
export const SESSION_EXPIRED_MESSAGE = 'Сесія закінчилась, увійдіть знову.';
export const OTP_VERIFY_FAILED_MESSAGE = 'Не вдалося підтвердити код.';
export const OTP_RESEND_FAILED_MESSAGE = 'Не вдалося надіслати код ще раз.';
