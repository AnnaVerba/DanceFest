import { Global, Module } from '@nestjs/common';
import { TwilioVerifyProvider } from './twilio-verify.provider';

@Global()
@Module({
  providers: [TwilioVerifyProvider],
  exports: [TwilioVerifyProvider],
})
export class SmsModule {}
