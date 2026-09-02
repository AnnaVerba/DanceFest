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

// Значення з обома заповненими межами — лише вони беруть участь у підборі.
interface BoundedAgeCategory extends AgeCategoryRange {
  ageFrom: number;
  ageTo: number;
}

function isBounded<T extends AgeCategoryRange>(
  category: T,
): category is T & BoundedAgeCategory {
  return category.ageFrom !== null && category.ageTo !== null;
}

const DATE_ONLY_LENGTH = 10;

/**
 * Дата народження й дата конкурсу зберігаються як DATEONLY. Беремо перші
 * десять символів і складаємо дату явно: `new Date(рядок)` для значення з
 * часовою зоною зсуває добу, і дитина на межі дня народження провалюється
 * в сусідню вікову категорію.
 */
function parseDateOnly(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const [year, month, day] = value
    .slice(0, DATE_ONLY_LENGTH)
    .split('-')
    .map(Number);
  return { year, month, day };
}

/** Повний вік на задану дату. */
export function fullYearsAt(birthDate: string, referenceDate: string): number {
  const birth = parseDateOnly(birthDate);
  const reference = parseDateOnly(referenceDate);

  let age = reference.year - birth.year;
  const birthdayPassed =
    reference.month > birth.month ||
    (reference.month === birth.month && reference.day >= birth.day);
  if (!birthdayPassed) age -= 1;

  return age;
}

export interface AgeRangeOverlap {
  first: BoundedAgeCategory;
  second: BoundedAgeCategory;
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
  const ranges = ageCategories.filter(isBounded);

  const overlaps: AgeRangeOverlap[] = [];
  for (let i = 0; i < ranges.length; i++) {
    for (let j = i + 1; j < ranges.length; j++) {
      const first = ranges[i];
      const second = ranges[j];
      if (first.ageFrom <= second.ageTo && second.ageFrom <= first.ageTo) {
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
    ageCategories
      .filter(isBounded)
      .find((category) => age >= category.ageFrom && age <= category.ageTo) ??
    null
  );
}
