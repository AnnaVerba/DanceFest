import { ConfigService } from '@nestjs/config';
import {
  DEFAULT_OCP_AUDIO_PREFIX,
  DEFAULT_OCP_IMAGES_PREFIX,
  OCP_AUDIO_PREFIX_ENV_KEY,
  OCP_IMAGES_PREFIX_ENV_KEY,
} from './uploads.constants';

export function resolveImagesKeyPrefix(config: ConfigService): string {
  return (
    config.get<string>(OCP_IMAGES_PREFIX_ENV_KEY) ?? DEFAULT_OCP_IMAGES_PREFIX
  );
}

export function resolveAudioKeyPrefix(config: ConfigService): string {
  return (
    config.get<string>(OCP_AUDIO_PREFIX_ENV_KEY) ?? DEFAULT_OCP_AUDIO_PREFIX
  );
}
