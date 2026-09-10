import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MusicExportRunner } from './music-export.runner';
import { MUSIC_EXPORT_QUEUE_NAME } from './music-export.constants';

// worker mode only (see MusicExportModule): a thin BullMQ adapter over
// MusicExportRunner. cloud-run-job mode runs the same runner from
// src/music-export-job.ts instead.
@Processor(MUSIC_EXPORT_QUEUE_NAME)
export class MusicExportProcessor extends WorkerHost {
  constructor(private readonly runner: MusicExportRunner) {
    super();
  }

  async process(job: Job<{ exportJobId: string }>): Promise<void> {
    await this.runner.run(job.data.exportJobId);
  }
}
