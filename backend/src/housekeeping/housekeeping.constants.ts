import { CronExpression } from '@nestjs/schedule';

// worker mode only — cloud-run-job mode runs the same sweeps from
// src/maintenance-job.ts on a Cloud Scheduler trigger instead.
export const HOUSEKEEPING_CRON_EXPRESSION = CronExpression.EVERY_HOUR;
