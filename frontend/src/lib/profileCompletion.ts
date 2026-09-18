import { ACCESS_LEVEL } from './roles';
import type { AccessLevel } from './roles';

// Route of the screen that collects the missing fields.
export const COMPLETE_PROFILE_PATH = '/complete-profile';

// A user may defer the completion screen. The choice lives in
// sessionStorage, so the gate stops nagging until the tab is closed or a
// different account signs in (saveSession / clearSession clear it).
const PROFILE_COMPLETION_SKIP_KEY = 'danfest.profileCompletionSkipped';

export function skipProfileCompletionForSession(): void {
  try {
    sessionStorage.setItem(PROFILE_COMPLETION_SKIP_KEY, '1');
  } catch {
    /* storage unavailable — the gate simply keeps prompting */
  }
}

export function isProfileCompletionSkipped(): boolean {
  try {
    return sessionStorage.getItem(PROFILE_COMPLETION_SKIP_KEY) === '1';
  } catch {
    return false;
  }
}

export function clearProfileCompletionSkip(): void {
  try {
    sessionStorage.removeItem(PROFILE_COMPLETION_SKIP_KEY);
  } catch {
    /* nothing to clear */
  }
}

// Gates the /complete-profile screen. Unlike the backend's
// `isProfileComplete` (users/profile-completeness.ts), a COACH is never
// sent there at registration — they can add their school and mentor coach
// later from the profile screen instead.
//  - PARTICIPANT needs a coach to pass this gate,
//  - COACH / ORGANIZER / ADMIN always pass it.
export interface ProfileCompletionInput {
  accessLevel: AccessLevel;
  schoolId: string | null;
  coachId: string | null;
}

export function isProfileComplete(profile: ProfileCompletionInput): boolean {
  if (profile.accessLevel === ACCESS_LEVEL.PARTICIPANT) {
    return profile.coachId !== null;
  }
  return true;
}

export function needsProfileCompletion(
  profile: ProfileCompletionInput,
): boolean {
  return !isProfileComplete(profile);
}
