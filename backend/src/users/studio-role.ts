import { AccessLevel, isStudioStaff } from '../auth/access-level.enum';
import { StudioRole } from './studio-role.enum';
import type { StudioMember } from './studio-member.interface';

// Works in a studio — as a trainer or its head — whatever the access level:
// a trainer or head who became an organizer still trains / heads (TASK-16).
export function hasStudioRole(member: StudioMember): boolean {
  return isStudioStaff(member.accessLevel) || member.studioRole !== null;
}

// Heads a studio — also once they are an organizer.
export function isStudioHead(member: StudioMember): boolean {
  return member.studioRole === StudioRole.HEAD;
}

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
