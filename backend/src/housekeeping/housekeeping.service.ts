import { Injectable, Logger } from '@nestjs/common';
import { SessionStoreService } from '../auth/session-store.service';
import { OtpService } from '../auth/otp.service';
import { TeamService } from '../team/team.service';
import { MusicExportCleanupService } from '../music-export/music-export-cleanup.service';

// Deletes rows/objects that have passed their expiry and are already
// ignored by the app. One sweep failing does not stop the others.
@Injectable()
export class HousekeepingService {
  private readonly logger = new Logger(HousekeepingService.name);

  constructor(
    private readonly sessions: SessionStoreService,
    private readonly otp: OtpService,
    private readonly team: TeamService,
    private readonly archives: MusicExportCleanupService,
  ) {}

  async runAll(): Promise<void> {
    try {
      this.report('expired sessions', await this.sessions.deleteExpired());
    } catch (err) {
      this.reportFailure('expired sessions', err);
    }

    try {
      this.report('expired OTP codes', await this.otp.deleteExpired());
    } catch (err) {
      this.reportFailure('expired OTP codes', err);
    }

    try {
      this.report(
        'expired invitations',
        await this.team.deleteExpiredInvitations(),
      );
    } catch (err) {
      this.reportFailure('expired invitations', err);
    }

    try {
      this.report(
        'expired export archives',
        await this.archives.removeExpiredArchives(),
      );
    } catch (err) {
      this.reportFailure('expired export archives', err);
    }
  }

  private report(label: string, removed: number): void {
    if (removed > 0) {
      this.logger.log(`Removed ${removed} ${label}.`);
    }
  }

  private reportFailure(label: string, err: unknown): void {
    this.logger.error(
      `Sweep "${label}" failed: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}
