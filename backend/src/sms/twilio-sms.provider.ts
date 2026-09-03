import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { SmsProvider } from './sms-provider.interface';
import {
  SMS_NOT_CONFIGURED_MESSAGE,
  TWILIO_ACCOUNT_SID_ENV,
  TWILIO_AUTH_TOKEN_ENV,
  TWILIO_FROM_ENV,
} from './sms.constants';

@Injectable()
export class TwilioSmsProvider implements SmsProvider {
  private readonly logger = new Logger(TwilioSmsProvider.name);
  private client: Twilio | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Twilio | null {
    if (this.client) return this.client;
    const sid = this.config.get<string>(TWILIO_ACCOUNT_SID_ENV);
    const token = this.config.get<string>(TWILIO_AUTH_TOKEN_ENV);
    if (!sid || !token) {
      this.logger.warn(SMS_NOT_CONFIGURED_MESSAGE);
      return null;
    }
    this.client = twilio(sid, token);
    return this.client;
  }

  async send(to: string, message: string): Promise<void> {
    const client = this.getClient();
    const from = this.config.get<string>(TWILIO_FROM_ENV);
    if (!client || !from) {
      this.logger.warn(`${SMS_NOT_CONFIGURED_MESSAGE} → ${to}: ${message}`);
      return;
    }
    await client.messages.create({ to, from, body: message });
  }
}
