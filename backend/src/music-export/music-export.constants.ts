export const MUSIC_EXPORT_QUEUE_NAME = 'music-export';
export const BUILD_ARCHIVE_JOB_NAME = 'build-archive';

// How long a finished archive stays downloadable.
export const ARCHIVE_AVAILABILITY_HOURS = 24;
export const ARCHIVE_AVAILABILITY_SECONDS = ARCHIVE_AVAILABILITY_HOURS * 3600;

export const MUSIC_EXPORTS_KEY_PREFIX = 'music-exports';

export const EXPORT_JOB_NOT_FOUND_MESSAGE = 'Job не знайдено.';
export const EXPORT_ARCHIVE_EXPIRED_MESSAGE = 'Архів більше не доступний.';

// How many tracks are checked for existence in storage at once before the
// archive is built.
export const TRACK_EXISTENCE_CHECK_BATCH = 10;

// How often a running export re-reads its row to notice a cancel.
export const EXPORT_CANCEL_POLL_INTERVAL_MS = 3000;
export const EXPORT_CANCELLED_MESSAGE = 'Експорт скасовано.';
