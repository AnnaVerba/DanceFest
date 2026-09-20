import type { NominationAgeCategory } from './nominations';

// Mirrors the server's fullYearsAt: both dates are date-only, so they are
// compared in UTC to keep a birthday from shifting by a day.
export function ageAt(birthDate: string, referenceDate: string): number | null {
  if (!birthDate) return null;
  const born = new Date(birthDate);
  const reference = new Date(referenceDate);
  if (Number.isNaN(born.getTime()) || Number.isNaN(reference.getTime())) {
    return null;
  }
  let age = reference.getUTCFullYear() - born.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - born.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && reference.getUTCDate() < born.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

// A number is filed under its oldest dancer — the same rule as the server's
// isEligibleForAgeCategory. Null when nobody has a usable birth date.
export function oldestAge(
  birthDates: string[],
  referenceDate: string,
): number | null {
  const ages = birthDates
    .map((birthDate) => ageAt(birthDate, referenceDate))
    .filter((age): age is number => age !== null);
  return ages.length === 0 ? null : Math.max(...ages);
}

// A nomination without age limits fits everyone.
export function nominationFitsAge(
  age: number,
  categories: NominationAgeCategory[],
): boolean {
  const bounded = categories.filter(
    (c) => c.ageFrom !== null && c.ageTo !== null,
  );
  if (bounded.length === 0) return true;
  return bounded.some((c) => age >= c.ageFrom! && age <= c.ageTo!);
}
