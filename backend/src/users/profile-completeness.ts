import { AccessLevel, isStudioStaff } from '../auth/access-level.enum';

// The minimum a user must supply before they can use the app.
//  - PARTICIPANT: a coach they train under.
//  - TRAINER: the studio they work at — its head is found through it.
//  - COACH: the school they head — a head has no mentor coach.
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
  if (isStudioStaff(user.accessLevel)) {
    return user.schoolId !== null;
  }
  return true;
}
