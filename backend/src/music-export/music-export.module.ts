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
import { ExportJob } from './export-job.model';
import { MusicExportController } from './music-export.controller';
import { JobsController } from './jobs.controller';
import { MusicExportService } from './music-export.service';
import { MusicExportProcessor } from './music-export.processor';
import { MusicExportCleanupService } from './music-export-cleanup.service';
import { MUSIC_EXPORT_QUEUE_NAME } from './music-export.constants';

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
    BullModule.registerQueue({ name: MUSIC_EXPORT_QUEUE_NAME }),
    CompetitionsModule,
    UploadsModule,
  ],
  controllers: [MusicExportController, JobsController],
  providers: [
    MusicExportService,
    MusicExportProcessor,
    MusicExportCleanupService,
  ],
})
export class MusicExportModule {}
