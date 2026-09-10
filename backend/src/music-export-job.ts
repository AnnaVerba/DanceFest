import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { MusicExportRunner } from './music-export/music-export.runner';
import {
  EXPORT_JOB_ID_ENV_KEY,
  MISSING_EXPORT_JOB_ID_MESSAGE,
} from './music-export/music-export.constants';

// cloud-run-job mode entrypoint: one Cloud Run Job execution builds one
// export archive. CloudRunJobExportDispatcher passes the row id in
// EXPORT_JOB_ID. Exit code decides whether Cloud Run retries the execution.
async function run(): Promise<void> {
  const logger = new Logger('MusicExportJob');
  const exportJobId = process.env[EXPORT_JOB_ID_ENV_KEY];
  if (!exportJobId) {
    logger.error(MISSING_EXPORT_JOB_ID_MESSAGE);
    process.exit(1);
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    await app.get(MusicExportRunner).run(exportJobId);
    logger.log(`Export ${exportJobId} finished.`);
    await app.close();
    process.exit(0);
  } catch (err) {
    logger.error(
      `Export ${exportJobId} failed: ${err instanceof Error ? err.stack : err}`,
    );
    await app.close();
    process.exit(1);
  }
}

void run();
