import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ExportDispatcher } from './export-dispatcher.interface';
import {
  MUSIC_EXPORT_QUEUE_NAME,
  BUILD_ARCHIVE_JOB_NAME,
} from './music-export.constants';

// worker mode: enqueue for MusicExportProcessor to pick up.
@Injectable()
export class BullMqExportDispatcher implements ExportDispatcher {
  constructor(
    @InjectQueue(MUSIC_EXPORT_QUEUE_NAME) private readonly queue: Queue,
  ) {}

  async dispatch(exportJobId: string): Promise<void> {
    await this.queue.add(BUILD_ARCHIVE_JOB_NAME, { exportJobId });
  }
}
