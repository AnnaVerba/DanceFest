import type { AccessLevel } from './roles';
import type { STUDIO_ROLE } from './studioRole.constants';

export type StudioRole = (typeof STUDIO_ROLE)[keyof typeof STUDIO_ROLE];

// What decides whether someone works in a studio. `studioRole` is missing
// from sessions saved before it was added — read as none.
export interface StudioMember {
  accessLevel: AccessLevel;
  studioRole?: StudioRole | null;
}
