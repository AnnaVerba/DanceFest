import { fullYearsAt } from './resolve-age-category';
import type { AgeCategoryRange } from './resolve-age-category';

/**
 * Вік номера визначається за найстаршим учасником: для соло це просто вік
 * танцівника, для групи — найраніша дата народження. Це єдине місце, де
 * живе групове правило.
 */
function oldestBirthDate(birthDates: (string | null)[]): string | null {
  const known = birthDates.filter((date): date is string => date !== null);
  if (known.length === 0) return null;
  return known.reduce((oldest, date) => (date < oldest ? date : oldest));
}

/**
 * Чи підходить склад учасників під вікову категорію номінації на дату
 * конкурсу. Номінація без вікових меж або учасники без дати народження не
 * обмежуються: перевіряти нема чого.
 */
export function isEligibleForAgeCategory(
  birthDates: (string | null)[],
  category: AgeCategoryRange | null,
  referenceDate: string,
): boolean {
  if (!category || category.ageFrom === null || category.ageTo === null) {
    return true;
  }
  const oldest = oldestBirthDate(birthDates);
  if (oldest === null) return true;

  const age = fullYearsAt(oldest, referenceDate);
  return age >= category.ageFrom && age <= category.ageTo;
}
