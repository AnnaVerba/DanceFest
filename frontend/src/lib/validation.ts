import { isValidPhoneNumber } from 'react-phone-number-input';
import {
  MAX_AGE_YEARS,
  MIN_BIRTH_YEAR,
  NAME_MIN_LENGTH,
} from './validation.constants';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  if (!value.trim()) return false;
  return isValidPhoneNumber(value);
}

export function isValidName(value: string): boolean {
  return value.trim().length >= NAME_MIN_LENGTH;
}

// A real calendar date in "YYYY-MM-DD" form, not in the future, and
// inside the same age window the backend enforces.
export function isValidBirthDate(value: string): boolean {
  const trimmed = value.trim();
  if (!ISO_DATE_RE.test(trimmed)) return false;

  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  if (parsed.toISOString().slice(0, 10) !== trimmed) return false;

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (parsed.getTime() > todayUtc) return false;

  const oldestAllowed = Date.UTC(
    now.getUTCFullYear() - MAX_AGE_YEARS,
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return (
    parsed.getUTCFullYear() >= MIN_BIRTH_YEAR &&
    parsed.getTime() >= oldestAllowed
  );
}
