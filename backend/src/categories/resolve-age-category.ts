export const NO_AGE_CATEGORY_MESSAGE =
  'Вік учасника не підпадає під жодну вікову категорію цього конкурсу';

// Мінімум даних, потрібних для підбору. Модель сюди не тягнеться навмисно:
// функція не має знати ні про Sequelize, ні про решту колонок категорії.
export interface AgeCategoryRange {
  id: string;
  name: string;
  rangeFrom: number | null;
  rangeTo: number | null;
}

// Значення з обома заповненими межами — лише вони беруть участь у підборі.
interface BoundedAgeCategory extends AgeCategoryRange {
  rangeFrom: number;
  rangeTo: number;
}

function isBounded<T extends AgeCategoryRange>(
  category: T,
): category is T & BoundedAgeCategory {
  return category.rangeFrom !== null && category.rangeTo !== null;
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
      .find((category) => age >= category.rangeFrom && age <= category.rangeTo) ??
    null
  );
}
