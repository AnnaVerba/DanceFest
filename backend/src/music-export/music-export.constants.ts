export const MUSIC_EXPORT_QUEUE_NAME = 'music-export';
export const BUILD_ARCHIVE_JOB_NAME = 'build-archive';

// cloud-run-job mode: the container override the API sets when triggering a
// Cloud Run Job execution, and read back by src/music-export-job.ts.
export const EXPORT_JOB_ID_ENV_KEY = 'EXPORT_JOB_ID';

// cloud-run-job mode: where CloudRunJobExportDispatcher sends the run request.
export const GCP_PROJECT_ID_ENV_KEY = 'GCP_PROJECT_ID';
export const GCP_REGION_ENV_KEY = 'GCP_REGION';
export const MUSIC_EXPORT_JOB_NAME_ENV_KEY = 'MUSIC_EXPORT_JOB_NAME';

export const CLOUD_RUN_JOB_NOT_CONFIGURED_MESSAGE =
  `cloud-run-job mode needs ${GCP_PROJECT_ID_ENV_KEY}, ${GCP_REGION_ENV_KEY} ` +
  `and ${MUSIC_EXPORT_JOB_NAME_ENV_KEY}.`;

export const MISSING_EXPORT_JOB_ID_MESSAGE = `${EXPORT_JOB_ID_ENV_KEY} is not set.`;

// How long a finished archive stays downloadable.
export const ARCHIVE_AVAILABILITY_HOURS = 24;
export const ARCHIVE_AVAILABILITY_SECONDS = ARCHIVE_AVAILABILITY_HOURS * 3600;

export const MUSIC_EXPORTS_KEY_PREFIX = 'music-exports';

export const EXPORT_JOB_NOT_FOUND_MESSAGE = 'Job не знайдено.';
export const EXPORT_ARCHIVE_EXPIRED_MESSAGE = 'Архів більше не доступний.';
