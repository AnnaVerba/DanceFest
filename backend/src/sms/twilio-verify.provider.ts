import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import type { Twilio } from 'twilio';
import { OtpProvider } from './otp-provider.interface';
import {
  SMS_NOT_CONFIGURED_MESSAGE,
  TWILIO_ACCOUNT_SID_ENV,
  TWILIO_AUTH_TOKEN_ENV,
  TWILIO_VERIFY_SERVICE_SID_ENV,
  VERIFY_CHANNEL_SMS,
  VERIFY_STATUS_APPROVED,
} from './sms.constants';

@Injectable()
export class TwilioVerifyProvider implements OtpProvider {
  private readonly logger = new Logger(TwilioVerifyProvider.name);
  private client: Twilio | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): Twilio {
    if (this.client) return this.client;
    const sid = this.config.get<string>(TWILIO_ACCOUNT_SID_ENV);
    const token = this.config.get<string>(TWILIO_AUTH_TOKEN_ENV);
    if (!sid || !token) {
      throw new Error(SMS_NOT_CONFIGURED_MESSAGE);
    }
    this.client = twilio(sid, token);
    return this.client;
  }

  private verifyServiceSid(): string {
    const serviceSid = this.config.get<string>(TWILIO_VERIFY_SERVICE_SID_ENV);
    if (!serviceSid) {
      throw new Error(SMS_NOT_CONFIGURED_MESSAGE);
    }
    return serviceSid;
  }

  async start(phone: string): Promise<void> {
    await this.getClient()
      .verify.v2.services(this.verifyServiceSid())
      .verifications.create({ to: phone, channel: VERIFY_CHANNEL_SMS });
  }

  async check(phone: string, code: string): Promise<boolean> {
    const client = this.getClient();
    const serviceSid = this.verifyServiceSid();
    try {
      const result = await client.verify.v2
        .services(serviceSid)
        .verificationChecks.create({ to: phone, code });
      return result.status === VERIFY_STATUS_APPROVED;
    } catch (error) {
      this.logger.warn(`Twilio Verify check failed: ${(error as Error).message}`);
      return false;
    }
  }
}
