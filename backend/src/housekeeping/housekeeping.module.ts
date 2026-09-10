import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { TeamModule } from '../team/team.module';
import { MusicExportModule } from '../music-export/music-export.module';
import { BackgroundJobsMode } from '../background-jobs/background-jobs-mode.enum';
import { currentBackgroundJobsMode } from '../background-jobs/background-jobs-mode';
import { HousekeepingService } from './housekeeping.service';
import { HousekeepingCron } from './housekeeping.cron';

const isWorkerMode = currentBackgroundJobsMode() === BackgroundJobsMode.Worker;

// worker mode: HousekeepingCron drives the sweeps on a timer.
// cloud-run-job mode: no cron — src/maintenance-job.ts calls
// HousekeepingService.runAll() on a Cloud Scheduler trigger.
@Module({
  imports: [AuthModule, TeamModule, MusicExportModule],
  providers: [HousekeepingService, ...(isWorkerMode ? [HousekeepingCron] : [])],
  exports: [HousekeepingService],
})
export class HousekeepingModule {}
