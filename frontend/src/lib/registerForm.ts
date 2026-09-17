import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
  PASSWORD_TOO_WEAK_MESSAGE,
} from './auth.constants';
import {
  isStrongPassword,
  isValidBirthDate,
  isValidEmail,
  isValidName,
  isValidPhone,
} from './validation';
import {
  BIRTH_DATE_INVALID_MESSAGE,
  EMAIL_INVALID_MESSAGE,
  NAME_INVALID_MESSAGE,
  PHONE_INVALID_MESSAGE,
} from './validation.constants';
import type {
  RegisterFieldErrors,
  RegisterFormValues,
} from './registerForm.types';

// Checks every field at once so the form can flag all problems together.
export function validateRegisterForm(
  values: RegisterFormValues,
): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {};

  if (!isValidName(values.firstName)) {
    errors.firstName = NAME_INVALID_MESSAGE;
  }
  if (!isValidName(values.lastName)) {
    errors.lastName = NAME_INVALID_MESSAGE;
  }
  if (!isValidPhone(values.phone)) {
    errors.phone = PHONE_INVALID_MESSAGE;
  }
  if (!isValidEmail(values.email)) {
    errors.email = EMAIL_INVALID_MESSAGE;
  }
  if (!isValidBirthDate(values.birthDate)) {
    errors.birthDate = BIRTH_DATE_INVALID_MESSAGE;
  }
  if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = PASSWORD_TOO_SHORT_MESSAGE;
  } else if (!isStrongPassword(values.password)) {
    errors.password = PASSWORD_TOO_WEAK_MESSAGE;
  }
  if (values.password !== values.confirmPassword) {
    errors.confirmPassword = PASSWORD_MISMATCH_MESSAGE;
  }

  return errors;
}
