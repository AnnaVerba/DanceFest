import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SmsProvider } from './sms-provider.interface';
import { DevSmsProvider } from './dev-sms.provider';
import { TwilioSmsProvider } from './twilio-sms.provider';
import { TurboSmsProvider } from './turbosms-sms.provider';
import {
  SMS_PROVIDER_DEV,
  SMS_PROVIDER_ENV,
  SMS_PROVIDER_TURBOSMS,
  SMS_PROVIDER_TWILIO,
} from './sms.constants';

@Injectable()
export class SmsService {
  constructor(
    private readonly config: ConfigService,
    private readonly dev: DevSmsProvider,
    private readonly twilio: TwilioSmsProvider,
    private readonly turbosms: TurboSmsProvider,
  ) {}

  private providerName(): string {
    return this.config.get<string>(SMS_PROVIDER_ENV) ?? SMS_PROVIDER_DEV;
  }

  isDev(): boolean {
    return this.providerName() === SMS_PROVIDER_DEV;
  }

  private provider(): SmsProvider {
    switch (this.providerName()) {
      case SMS_PROVIDER_TWILIO:
        return this.twilio;
      case SMS_PROVIDER_TURBOSMS:
        return this.turbosms;
      default:
        return this.dev;
    }
  }

  send(to: string, message: string): Promise<void> {
    return this.provider().send(to, message);
  }
}
