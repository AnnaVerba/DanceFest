export const ALLOWED_TRACK_MIME_TYPES = [
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
];

export const TRACK_MIME_EXTENSIONS: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

export const MAX_TRACK_SIZE_BYTES = 20 * 1024 * 1024;

export const ENTRY_TRACKS_KEY_PREFIX = 'entry-tracks';

export const TRACK_FILE_MISSING_MESSAGE = 'Файл не передано.';
export const UNSUPPORTED_TRACK_FORMAT_MESSAGE =
  'Непідтримуваний формат файлу. Дозволено: MP3, WAV.';
export const TRACK_TOO_LARGE_MESSAGE = 'Файл завеликий. Максимум — 20 МБ.';
export const DURATION_READ_FAILED_MESSAGE =
  'Не вдалося визначити тривалість треку. Спробуйте інший файл або формат';
export const IMPROV_TRACK_NOT_NEEDED_MESSAGE =
  'Для імпровізації трек не потрібен — музику вмикає організатор';
export const TRACK_NOT_FOUND_MESSAGE = 'Трек не знайдено.';

// Machine-readable, per the ticket's `403 MUSIC_LOCKED` — unlike the rest
// of the app's (human, Ukrainian) error messages, this one is a code
// clients are expected to branch on.
export const MUSIC_LOCKED_MESSAGE = 'MUSIC_LOCKED';
