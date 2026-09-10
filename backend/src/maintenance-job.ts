import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HousekeepingService } from './housekeeping/housekeeping.service';

// cloud-run-job mode entrypoint: run every housekeeping sweep once and
// exit. Wire this to Cloud Scheduler (e.g. hourly). worker mode uses
// HousekeepingCron instead and never runs this.
async function run(): Promise<void> {
  const logger = new Logger('MaintenanceJob');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  try {
    await app.get(HousekeepingService).runAll();
    await app.close();
    process.exit(0);
  } catch (err) {
    logger.error(
      `Maintenance failed: ${err instanceof Error ? err.stack : err}`,
    );
    await app.close();
    process.exit(1);
  }
}

void run();
