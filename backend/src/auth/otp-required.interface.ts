export interface OtpRequired {
  otpRequired: true;
  // The masked phone the code was sent to, e.g. "+380••••••67".
  phone: string;
}
