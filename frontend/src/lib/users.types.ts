import type { SetMentorCoachBody } from './auth';

// What a user may change in their own profile. Email and birth date are
// left out when empty, so an account that never had them keeps none;
// school and coach are sent only when the user changed them.
interface UpdateMyProfileFields {
  firstName: string;
  lastName: string;
  email?: string;
  birthDate?: string;
  schoolId?: string;
}

export type UpdateMyProfileInput =
  | UpdateMyProfileFields
  | (UpdateMyProfileFields & SetMentorCoachBody);
