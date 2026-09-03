import { SetMetadata } from '@nestjs/common';
import { AccessLevel } from './access-level.enum';

export const MIN_LEVEL_KEY = 'minLevel';

// Route needs at least this access level. Ownership of the specific
// resource is checked separately, inside the service.
export const MinLevel = (level: AccessLevel) =>
  SetMetadata(MIN_LEVEL_KEY, level);
