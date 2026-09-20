import { isValidBirthDate, isValidEmail, isValidName } from './validation';
import {
  BIRTH_DATE_INVALID_MESSAGE,
  EMAIL_INVALID_MESSAGE,
  NAME_INVALID_MESSAGE,
} from './validation.constants';
import { SCHOOL_REQUIRED_MESSAGE } from './schools.constants';
import type { MyProfile } from './users';
import type { ProfileFieldErrors, ProfileFormValues } from './profileForm.types';

export function toProfileForm(profile: MyProfile): ProfileFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName,
    email: profile.email ?? '',
    birthDate: profile.birthDate ?? '',
    schoolId: profile.schoolId ?? '',
  };
}

// Email, birth date and school may stay empty only on an account that
// never had them — the backend cannot clear a value once it is set.
export function validateProfileForm(
  values: ProfileFormValues,
  initial: ProfileFormValues,
): ProfileFieldErrors {
  const errors: ProfileFieldErrors = {};

  if (!isValidName(values.firstName)) {
    errors.firstName = NAME_INVALID_MESSAGE;
  }
  if (!isValidName(values.lastName)) {
    errors.lastName = NAME_INVALID_MESSAGE;
  }
  if ((values.email.trim() || initial.email) && !isValidEmail(values.email)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }
  if (
    (values.birthDate || initial.birthDate) &&
    !isValidBirthDate(values.birthDate)
  ) {
    errors.birthDate = BIRTH_DATE_INVALID_MESSAGE;
  }
  if (initial.schoolId && !values.schoolId) {
    errors.schoolId = SCHOOL_REQUIRED_MESSAGE;
  }

  return errors;
}
