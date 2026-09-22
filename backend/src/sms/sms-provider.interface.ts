export interface SmsProvider {
  // Sends one SMS. Throws on delivery failure.
  send(to: string, message: string): Promise<void>;
}
