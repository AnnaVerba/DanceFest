export const SMS_PROVIDER_ENV = 'SMS_PROVIDER';
export const SMS_PROVIDER_DEV = 'dev';
export const SMS_PROVIDER_TWILIO = 'twilio';
export const SMS_PROVIDER_TURBOSMS = 'turbosms';

export const TWILIO_ACCOUNT_SID_ENV = 'TWILIO_ACCOUNT_SID';
export const TWILIO_AUTH_TOKEN_ENV = 'TWILIO_AUTH_TOKEN';
export const TWILIO_FROM_ENV = 'TWILIO_FROM';
export const TURBOSMS_TOKEN_ENV = 'TURBOSMS_TOKEN';
export const TURBOSMS_SENDER_ENV = 'TURBOSMS_SENDER';

// The code every dev / test login expects.
export const DEV_OTP_CODE = '1111';

export const TURBOSMS_SEND_URL = 'https://api.turbosms.ua/message/send.json';

export const SMS_NOT_CONFIGURED_MESSAGE =
  'SMS-провайдер не налаштований — код не надіслано, лише залоговано.';
