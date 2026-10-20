import { fullYearsAt } from './resolve-age-category';
import type { AgeCategoryRange } from './resolve-age-category';

/**
 * Чи підходить склад учасників під вікову категорію номінації на дату
 * конкурсу: у межі категорії мусить потрапляти хоча б один учасник з відомою
 * датою народження — змішаний склад реєструють за старшим учасником.
 * Номінація без вікових меж або учасники без дати народження не обмежуються:
 * перевіряти нема чого.
 */
export function isEligibleForAgeCategory(
  birthDates: (string | null)[],
  category: AgeCategoryRange | null,
  referenceDate: string,
): boolean {
  if (!category || category.rangeFrom === null || category.rangeTo === null) {
    return true;
  }
  const { rangeFrom, rangeTo } = category;

  const known = birthDates.filter((date): date is string => date !== null);
  if (known.length === 0) return true;

  return known.some((date) => {
    const age = fullYearsAt(date, referenceDate);
    return age >= rangeFrom && age <= rangeTo;
  });
}
