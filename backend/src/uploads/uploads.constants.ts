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

export const ALLOWED_DOCUMENT_MIME_TYPES = ['application/pdf'];

export const DOCUMENT_MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
};

export const STORAGE_NOT_CONFIGURED_MESSAGE =
  'Сховище зображень не налаштовано. Зверніться до адміністратора застосунку.';
export const UNSUPPORTED_FILE_FORMAT_MESSAGE =
  'Непідтримуваний формат файлу. Дозволено: JPEG, PNG, WEBP, GIF.';
export const UNSUPPORTED_DOCUMENT_FORMAT_MESSAGE =
  'Непідтримуваний формат файлу. Дозволено лише PDF.';
export const FILE_MISSING_MESSAGE = 'Файл не передано.';

export const COMPETITION_BANNERS_KEY_PREFIX = 'competition-banners';
export const COMPETITION_DOCUMENTS_KEY_PREFIX = 'competition-documents';

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
// A festival's regulations PDF carries scans and logos, so it outgrows the
// banner limit well before it stops being a reasonable upload.
export const MAX_DOCUMENT_FILE_SIZE_BYTES = 20 * 1024 * 1024;

// OCP doesn't apply a bucket's public-read setting to objects retroactively
// or by default — each object needs this ACL at upload time to be fetchable
// by an unauthenticated <img>/<audio> src.
export const PUBLIC_READ_ACL = 'public-read';

export const IMAGE_UPLOAD_CONFIG: FileUploadConfig = {
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  mimeExtensions: MIME_EXTENSIONS,
  keyPrefix: COMPETITION_BANNERS_KEY_PREFIX,
  unsupportedFormatMessage: UNSUPPORTED_FILE_FORMAT_MESSAGE,
};

export const DOCUMENT_UPLOAD_CONFIG: FileUploadConfig = {
  allowedMimeTypes: ALLOWED_DOCUMENT_MIME_TYPES,
  mimeExtensions: DOCUMENT_MIME_EXTENSIONS,
  keyPrefix: COMPETITION_DOCUMENTS_KEY_PREFIX,
  unsupportedFormatMessage: UNSUPPORTED_DOCUMENT_FORMAT_MESSAGE,
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

// Top-level "folders" (key prefixes) inside the bucket — one for images,
// one for everything audio (entry tracks + generated export archives).
// Configurable so the bucket's actual folder names never need a code change.
export const OCP_IMAGES_PREFIX_ENV_KEY = 'OCP_IMAGES_PREFIX';
export const OCP_AUDIO_PREFIX_ENV_KEY = 'OCP_AUDIO_PREFIX';
export const DEFAULT_OCP_IMAGES_PREFIX = 'images';
export const DEFAULT_OCP_AUDIO_PREFIX = 'audio';
