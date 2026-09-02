export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export const STORAGE_NOT_CONFIGURED_MESSAGE =
  'Сховище зображень не налаштовано. Зверніться до адміністратора застосунку.';
export const UNSUPPORTED_FILE_FORMAT_MESSAGE =
  'Непідтримуваний формат файлу. Дозволено: JPEG, PNG, WEBP, GIF.';
export const FILE_MISSING_MESSAGE = 'Файл не передано.';

export const COMPETITION_BANNERS_KEY_PREFIX = 'competition-banners';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
