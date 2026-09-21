import { fullYearsAt } from './resolve-age-category';
import type { AgeCategoryRange } from './resolve-age-category';

/**
 * Чи підходить склад учасників під вікову категорію номінації на дату
 * конкурсу: у межі категорії мусить потрапляти кожен учасник з відомою датою
 * народження. Номінація без вікових меж або учасники без дати народження не
 * обмежуються: перевіряти нема чого.
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

  return birthDates
    .filter((date): date is string => date !== null)
    .every((date) => {
      const age = fullYearsAt(date, referenceDate);
      return age >= rangeFrom && age <= rangeTo;
    });
}
