import { AccessLevel } from '../auth/access-level.enum';
import { StudioRole } from './studio-role.enum';

// The studio role a user has once their access level becomes `level`:
// reaching COACH makes them a studio head, TRAINER a trainer; any other
// level (an organizer, say) keeps the role they had.
export function studioRoleAfter(
  level: AccessLevel,
  current: StudioRole | null,
): StudioRole | null {
  if (level === AccessLevel.COACH) return StudioRole.HEAD;
  if (level === AccessLevel.TRAINER) return StudioRole.TRAINER;
  return current;
}
