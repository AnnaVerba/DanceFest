export const NO_AGE_CATEGORY_MESSAGE =
  'Вік учасника не підпадає під жодну вікову категорію цього конкурсу';

// Мінімум даних, потрібних для підбору. Модель сюди не тягнеться навмисно:
// функція не має знати ні про Sequelize, ні про решту колонок категорії.
export interface AgeCategoryRange {
  id: string;
  name: string;
  ageFrom: number | null;
  ageTo: number | null;
}

/**
 * Повний вік на задану дату. Рік мінус рік, і на один менше, якщо день
 * народження цього року ще не настав.
 */
export function fullYearsAt(birthDate: string, referenceDate: string): number {
  const birth = new Date(birthDate);
  const reference = new Date(referenceDate);

  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birth.getUTCMonth();
  if (
    monthDiff < 0 ||
    (monthDiff === 0 && reference.getUTCDate() < birth.getUTCDate())
  ) {
    age -= 1;
  }
  return age;
}

export interface AgeRangeOverlap {
  first: AgeCategoryRange;
  second: AgeCategoryRange;
}

/**
 * Перетин діапазонів робить автовизначення категорії неоднозначним: дитина
 * 12 років підпадає і під 9–12, і під 12–15, а вибір першого збігу тоді
 * залежить від порядку рядків.
 *
 * Перевіряється набір, обраний для одного конкурсу, а не вся таблиця:
 * `categories` — спільний довідник, і різні конкурси мають право на різні
 * вікові сітки.
 */
export function findAgeRangeOverlaps(
  ageCategories: AgeCategoryRange[],
): AgeRangeOverlap[] {
  const ranges = ageCategories.filter(
    (category) => category.ageFrom !== null && category.ageTo !== null,
  );

  const overlaps: AgeRangeOverlap[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const first = ranges[i];
      const second = ranges[j];
      if (first.ageFrom! <= second.ageTo! && second.ageFrom! <= first.ageTo!) {
        overlaps.push({ first, second });
      }
    }
  }
  return overlaps;
}

/**
 * Вікова категорія рахується на **дату початку конкурсу**, а не на «сьогодні»:
 * інакше та сама дитина потрапляла б у різні категорії залежно від того, коли
 * подали заявку.
 */
export function resolveAgeCategory<T extends AgeCategoryRange>(
  birthDate: string | null,
  ageCategories: T[],
  referenceDate: string,
): T | null {
  if (!birthDate) return null;

  const age = fullYearsAt(birthDate, referenceDate);

  return (
    ageCategories.find(
      (category) =>
        category.ageFrom !== null &&
        category.ageTo !== null &&
        age >= category.ageFrom &&
        age <= category.ageTo,
    ) ?? null
  );
}
