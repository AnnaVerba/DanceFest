export interface OtpProvider {
  // Starts a verification: the provider generates the code and sends it.
  start(phone: string): Promise<void>;

  // Checks a code against the provider's pending verification for the phone.
  check(phone: string, code: string): Promise<boolean>;
}
