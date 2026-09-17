// Describes one category of file this service accepts (images, audio
// tracks, ...) — what's allowed, where it's keyed, and how large it may be.
export interface FileUploadConfig {
  allowedMimeTypes: string[];
  mimeExtensions: Record<string, string>;
  keyPrefix: string;
  unsupportedFormatMessage: string;
}
