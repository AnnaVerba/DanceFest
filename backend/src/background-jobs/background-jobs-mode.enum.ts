// How deferred work (music-archive export, periodic housekeeping) is run.
//   worker        - an always-on process: BullMQ queue + @Cron decorators.
//   cloud-run-job  - each unit of work is a separate Cloud Run Job execution,
//                    triggered on demand (export) or by Cloud Scheduler
//                    (housekeeping). No Redis, no in-process cron.
export enum BackgroundJobsMode {
  Worker = 'worker',
  CloudRunJob = 'cloud-run-job',
}
