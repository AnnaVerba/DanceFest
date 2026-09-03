import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { DevSmsProvider } from './dev-sms.provider';
import { TwilioSmsProvider } from './twilio-sms.provider';
import { TurboSmsProvider } from './turbosms-sms.provider';

@Global()
@Module({
  providers: [SmsService, DevSmsProvider, TwilioSmsProvider, TurboSmsProvider],
  exports: [SmsService],
})
export class SmsModule {}
