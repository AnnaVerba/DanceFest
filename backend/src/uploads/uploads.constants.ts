import type { FileUploadConfig } from './file-upload-config.interface';

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

export const IMAGE_UPLOAD_CONFIG: FileUploadConfig = {
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  mimeExtensions: MIME_EXTENSIONS,
  keyPrefix: COMPETITION_BANNERS_KEY_PREFIX,
  unsupportedFormatMessage: UNSUPPORTED_FILE_FORMAT_MESSAGE,
};

// Env var keys for the S3-compatible client, storing to OneCloudPlanet's
// (OCP) Object Storage. The client itself (@aws-sdk/client-s3) works
// against any S3-compatible provider — only these names tie it to OCP.
export const OCP_REGION_ENV_KEY = 'OCP_REGION';
export const OCP_ACCESS_KEY_ID_ENV_KEY = 'OCP_ACCESS_KEY_ID';
export const OCP_SECRET_ACCESS_KEY_ENV_KEY = 'OCP_SECRET_ACCESS_KEY';
export const OCP_BUCKET_ENV_KEY = 'OCP_BUCKET';
export const OCP_PUBLIC_URL_ENV_KEY = 'OCP_PUBLIC_URL';
export const OCP_ENDPOINT_ENV_KEY = 'OCP_ENDPOINT';
