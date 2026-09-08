import { ACCESS_LEVEL } from './roles';
import type { AccessLevel } from './roles';

// Route of the screen that collects the missing fields.
export const COMPLETE_PROFILE_PATH = '/complete-profile';

// Mirrors the backend `isProfileComplete` (users/profile-completeness.ts):
//  - PARTICIPANT needs a coach,
//  - COACH needs a school and a coach,
//  - ORGANIZER / ADMIN are always complete.
export interface ProfileCompletionInput {
  accessLevel: AccessLevel;
  schoolId: string | null;
  coachId: string | null;
}

export function isProfileComplete(profile: ProfileCompletionInput): boolean {
  if (profile.accessLevel === ACCESS_LEVEL.PARTICIPANT) {
    return profile.coachId !== null;
  }
  if (profile.accessLevel === ACCESS_LEVEL.COACH) {
    return profile.schoolId !== null && profile.coachId !== null;
  }
  return true;
}

export function needsProfileCompletion(
  profile: ProfileCompletionInput,
): boolean {
  return !isProfileComplete(profile);
}
