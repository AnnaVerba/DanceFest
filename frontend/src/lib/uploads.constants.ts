export const IMAGE_UPLOAD_FAILED_MESSAGE =
  'Не вдалося завантажити зображення. Спробуйте ще раз.';
export const DOCUMENT_UPLOAD_FAILED_MESSAGE =
  'Не вдалося завантажити файл. Спробуйте ще раз.';
export const PDF_ACCEPT = 'application/pdf';

// iOS Safari maps a bare `audio/*` onto a UTI set its document picker will not
// hand back: the sheet opens, but every audio file in it is greyed out. Listing
// the concrete MIME types and extensions the backend accepts (MP3, WAV — see
// ALLOWED_TRACK_MIME_TYPES) keeps the picker usable there without widening what
// other browsers offer.
export const AUDIO_ACCEPT = '.mp3,.wav,audio/mpeg,audio/wav,audio/x-wav';
