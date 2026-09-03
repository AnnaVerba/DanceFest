import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms-provider.interface';
import {
  SMS_NOT_CONFIGURED_MESSAGE,
  TURBOSMS_SENDER_ENV,
  TURBOSMS_SEND_URL,
  TURBOSMS_TOKEN_ENV,
} from './sms.constants';

@Injectable()
export class TurboSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TurboSmsProvider.name);

  constructor(private readonly config: ConfigService) {}

  async send(to: string, message: string): Promise<void> {
    const token = this.config.get<string>(TURBOSMS_TOKEN_ENV);
    const sender = this.config.get<string>(TURBOSMS_SENDER_ENV);
    if (!token || !sender) {
      this.logger.warn(`${SMS_NOT_CONFIGURED_MESSAGE} → ${to}: ${message}`);
      return;
    }
    const response = await fetch(TURBOSMS_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipients: [to],
        sms: { sender, text: message },
      }),
    });
    if (!response.ok) {
      throw new Error(`TurboSMS ${response.status}: ${await response.text()}`);
    }
  }
}
