import { Injectable, Logger } from '@nestjs/common';
import { SmsProvider } from './sms-provider.interface';

@Injectable()
export class DevSmsProvider implements SmsProvider {
  private readonly logger = new Logger(DevSmsProvider.name);

  send(to: string, message: string): Promise<void> {
    this.logger.log(`[dev SMS] → ${to}: ${message}`);
    return Promise.resolve();
  }
}
