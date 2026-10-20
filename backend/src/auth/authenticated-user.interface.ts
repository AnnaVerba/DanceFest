import { AccessLevel } from './access-level.enum';
import type { StudioRole } from '../users/studio-role.enum';

export interface AuthenticatedUser {
  id: string;
  accessLevel: AccessLevel;
  // Kept apart from the access level: an organizer may still be a trainer
  // or a studio head.
  studioRole: StudioRole | null;
  email: string;
  firstName?: string;
  lastName?: string;
}
