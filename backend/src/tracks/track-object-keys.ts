import { ConfigService } from '@nestjs/config';
import { buildPublicObjectUrl } from '../uploads/build-public-object-url';
import { resolveAudioKeyPrefix } from '../uploads/resolve-ocp-key-prefix';
import {
  OCP_ENDPOINT_ENV_KEY,
  OCP_PUBLIC_URL_ENV_KEY,
} from '../uploads/uploads.constants';
import { ENTRY_TRACKS_KEY_PREFIX } from './tracks.constants';

// Every upload gets its own key (the upload time) so a replacement gets a new
// public URL — otherwise the same name maps to the same URL and browsers keep
// serving the old cached audio.
export function buildTrackObjectKey(
  config: ConfigService,
  competitionId: string,
  entryId: string,
  fileName: string,
): string {
  return `${resolveAudioKeyPrefix(config)}/${ENTRY_TRACKS_KEY_PREFIX}_${competitionId}_${entryId}_${Date.now()}_${fileName}`;
}

export function buildTrackPublicUrl(
  config: ConfigService,
  bucket: string,
  objectKey: string,
): string {
  return buildPublicObjectUrl(
    objectKey,
    bucket,
    config.get<string>(OCP_PUBLIC_URL_ENV_KEY) ?? null,
    config.get<string>(OCP_ENDPOINT_ENV_KEY) ?? null,
  );
}

// S3 reads the copy source as a URL path: every segment of the key is encoded.
export function buildCopySource(bucket: string, objectKey: string): string {
  return `${bucket}/${objectKey.split('/').map(encodeURIComponent).join('/')}`;
}
