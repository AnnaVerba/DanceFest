// Must match the Verify Service's CodeLength setting in the Twilio Console
// (default is 6 if not customized when the service was created).
export const OTP_CODE_LENGTH = 6;
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
export const OTP_MAX_SENDS_PER_HOUR = 5;
export const ONE_HOUR_MS = 60 * 60 * 1000;

export const OTP_RESEND_TOO_SOON_MESSAGE =
  'Зачекайте трохи перед повторним надсиланням коду.';
export const OTP_HOURLY_LIMIT_MESSAGE = 'Забагато спроб. Спробуйте пізніше.';
export const OTP_INVALID_OR_EXPIRED_MESSAGE = 'Невірний або прострочений код.';
