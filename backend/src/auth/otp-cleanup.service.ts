import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OtpService } from './otp.service';

@Injectable()
export class OtpCleanupService {
  private readonly logger = new Logger(OtpCleanupService.name);

  constructor(private readonly otpService: OtpService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async removeStaleOtpCodes(): Promise<void> {
    const removed = await this.otpService.deleteStale();
    this.logger.log(`Removed ${removed} stale OTP codes`);
  }
}
