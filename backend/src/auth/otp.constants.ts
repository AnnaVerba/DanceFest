export const OTP_CODE_LENGTH = 4;
export const OTP_TTL_MS = 5 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const ONE_HOUR_MS = 60 * 60 * 1000;

export const OTP_RESEND_TOO_SOON_MESSAGE =
  'Зачекайте трохи перед повторним надсиланням коду.';
export const OTP_HOURLY_LIMIT_MESSAGE = 'Забагато спроб. Спробуйте пізніше.';
export const OTP_INVALID_OR_EXPIRED_MESSAGE = 'Невірний або прострочений код.';
export const OTP_MESSAGE_TEMPLATE = 'Код для входу: %code%. Дійсний 5 хв.';
