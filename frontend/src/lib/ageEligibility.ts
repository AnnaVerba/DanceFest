import type { NominationCategoryRange } from './nominations';

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

// Ages of the dancers who have a usable birth date.
export function participantAges(
  birthDates: string[],
  referenceDate: string,
): number[] {
  return birthDates
    .map((birthDate) => ageAt(birthDate, referenceDate))
    .filter((age): age is number => age !== null);
}

function isBounded(category: NominationCategoryRange): boolean {
  return category.rangeFrom !== null && category.rangeTo !== null;
}

// A category fits a line-up only when every dancer's age is inside it — the
// same rule as the server's isEligibleForAgeCategory.
function fitsAllAges(ages: number[], category: NominationCategoryRange): boolean {
  return ages.every((age) => age >= category.rangeFrom! && age <= category.rangeTo!);
}

// A nomination without age limits fits everyone.
export function nominationFitsAges(
  ages: number[],
  categories: NominationCategoryRange[],
): boolean {
  const bounded = categories.filter(isBounded);
  if (bounded.length === 0) return true;
  return bounded.some((c) => fitsAllAges(ages, c));
}

// Age categories that fit every dancer, each name once — ranges may overlap,
// so several can fit and the coach picks one.
export function ageCategoriesFittingAges(
  ages: number[],
  categories: NominationCategoryRange[],
): NominationCategoryRange[] {
  const fitting = categories
    .filter(isBounded)
    .filter((c) => fitsAllAges(ages, c));
  return fitting.filter(
    (c, index) => fitting.findIndex((other) => other.name === c.name) === index,
  );
}

export function nominationHasAgeCategory(
  name: string,
  categories: NominationCategoryRange[],
): boolean {
  return categories.some((c) => c.name === name);
}
