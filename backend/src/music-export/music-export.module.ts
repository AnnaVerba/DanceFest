import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import { Entry } from '../entries/entry.model';
import { Nomination } from '../nominations/nomination.model';
import { Category } from '../categories/category.model';
import { User } from '../users/user.model';
import { Track } from '../tracks/track.model';
import { CompetitionsModule } from '../competitions/competitions.module';
import { UploadsModule } from '../uploads/uploads.module';
import { BackgroundJobsMode } from '../background-jobs/background-jobs-mode.enum';
import { currentBackgroundJobsMode } from '../background-jobs/background-jobs-mode';
import { ExportJob } from './export-job.model';
import { MusicExportController } from './music-export.controller';
import { JobsController } from './jobs.controller';
import { MusicExportService } from './music-export.service';
import { MusicExportRunner } from './music-export.runner';
import { MusicExportProcessor } from './music-export.processor';
import { MusicExportCleanupService } from './music-export-cleanup.service';
import { EXPORT_DISPATCHER } from './export-dispatcher.token';
import { BullMqExportDispatcher } from './bullmq-export.dispatcher';
import { CloudRunJobExportDispatcher } from './cloud-run-job-export.dispatcher';
import { MUSIC_EXPORT_QUEUE_NAME } from './music-export.constants';

const isWorkerMode = currentBackgroundJobsMode() === BackgroundJobsMode.Worker;

// worker mode: the export runs through a BullMQ queue + processor.
// cloud-run-job mode: no Redis at all — the dispatcher starts a Cloud Run
// Job execution instead (see CloudRunJobExportDispatcher).
@Module({
  imports: [
    SequelizeModule.forFeature([
      ExportJob,
      Entry,
      Nomination,
      Category,
      User,
      Track,
    ]),
    ...(isWorkerMode
      ? [BullModule.registerQueue({ name: MUSIC_EXPORT_QUEUE_NAME })]
      : []),
    CompetitionsModule,
    UploadsModule,
  ],
  controllers: [MusicExportController, JobsController],
  providers: [
    MusicExportService,
    MusicExportRunner,
    MusicExportCleanupService,
    {
      provide: EXPORT_DISPATCHER,
      useClass: isWorkerMode
        ? BullMqExportDispatcher
        : CloudRunJobExportDispatcher,
    },
    ...(isWorkerMode ? [MusicExportProcessor] : []),
  ],
  exports: [MusicExportRunner, MusicExportCleanupService],
})
export class MusicExportModule {}
