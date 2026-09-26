export const SMS_PROVIDER_ENV = 'SMS_PROVIDER';
export const SMS_PROVIDER_DEV = 'dev';
export const SMS_PROVIDER_FLY = 'fly';

export const SMS_FLY_API_KEY_ENV = 'SMS_FLY_API_KEY';
export const SMS_FLY_FROM_ENV = 'SMS_FLY_FROM';
export const SMS_FLY_API_URL_ENV = 'SMS_FLY_API_URL';

export const SMS_FLY_CHANNEL_SMS = 'sms';
export const SMS_FLY_CHANNEL_VIBER = 'viber';

// Viber sender name registered in SMS-fly (differs from the SMS sender).
export const SMS_FLY_VIBER_SOURCE = 'Promo';

// How long SMS-fly keeps trying to deliver a message per channel, in
// minutes (the `ttl` API parameter).
export const SMS_FLY_TTL_MINUTES = 5;

// The code every dev / test login expects.
export const DEV_OTP_CODE = '1111';

export const SMS_NOT_CONFIGURED_MESSAGE =
  'SMS-провайдер не налаштований — код не надіслано, лише залоговано.';
