import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionStoreService } from './session-store.service';

@Injectable()
export class SessionCleanupService {
  private readonly logger = new Logger(SessionCleanupService.name);

  constructor(private readonly sessionStore: SessionStoreService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async removeExpiredSessions(): Promise<void> {
    const removed = await this.sessionStore.deleteExpired();
    this.logger.log(`Removed ${removed} expired sessions`);
  }
}
