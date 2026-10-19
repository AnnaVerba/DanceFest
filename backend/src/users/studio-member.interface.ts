import type { AccessLevel } from '../auth/access-level.enum';
import type { StudioRole } from './studio-role.enum';

// What decides whether someone works in a studio: their access level and
// the studio role they keep even after becoming an organizer.
export interface StudioMember {
  accessLevel: AccessLevel;
  studioRole: StudioRole | null;
}
