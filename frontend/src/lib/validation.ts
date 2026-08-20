import { isValidPhoneNumber } from 'react-phone-number-input';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  if (!value.trim()) return false;
  return isValidPhoneNumber(value);
}
