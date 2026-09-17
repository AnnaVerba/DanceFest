// How often to re-poll GET /jobs/:jobId while an export is queued/processing.
export const MUSIC_EXPORT_POLL_INTERVAL_MS = 2000;

export const MUSIC_EXPORT_QUEUE_FAILED_MESSAGE =
  'Не вдалося поставити архів музики в чергу. Спробуйте ще раз.';
export const MUSIC_EXPORT_STATUS_FAILED_MESSAGE =
  'Не вдалося перевірити статус архіву музики.';
