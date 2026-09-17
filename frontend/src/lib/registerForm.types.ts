export interface RegisterFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
}

// One message per invalid field, shown right above that field.
export type RegisterFieldErrors = Partial<
  Record<keyof RegisterFormValues, string>
>;
