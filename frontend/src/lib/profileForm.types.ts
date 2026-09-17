export interface ProfileFormValues {
  firstName: string;
  lastName: string;
  email: string;
  birthDate: string;
  schoolId: string;
}

// The coach choice lives in its own picker, not in the form values, but
// its error is shown the same way.
export type ProfileErrorField = keyof ProfileFormValues | 'coach';

// One message per invalid field, shown right above that field.
export type ProfileFieldErrors = Partial<Record<ProfileErrorField, string>>;
