import { AccessLevel } from '../auth/access-level.enum';

// The minimum a user must supply before they can use the app.
//  - PARTICIPANT: a coach they train under.
//  - COACH: the school they work at AND a mentor coach.
//  - ORGANIZER / ADMIN: nothing — they are onboarded another way and an
//    admin has no coach.
export interface ProfileCompletenessInput {
  accessLevel: AccessLevel;
  schoolId: string | null;
  coachId: string | null;
}

export function isProfileComplete(user: ProfileCompletenessInput): boolean {
  if (user.accessLevel === AccessLevel.PARTICIPANT) {
    return user.coachId !== null;
  }
  if (user.accessLevel === AccessLevel.COACH) {
    return user.schoolId !== null && user.coachId !== null;
  }
  return true;
}
