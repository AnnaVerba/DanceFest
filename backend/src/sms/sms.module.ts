import { Global, Module } from '@nestjs/common';
import { SmsService } from './sms.service';
import { DevSmsProvider } from './dev-sms.provider';
import { SmsFlyProvider } from './fly.provider';

@Global()
@Module({
  providers: [SmsService, DevSmsProvider, SmsFlyProvider],
  exports: [SmsService],
})
export class SmsModule {}
