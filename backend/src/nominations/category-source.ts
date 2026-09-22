/**
 * Чиї категорії бере вибірка. Звичайні номінації та спеціальні живуть за
 * різними правилами: перші фільтруються за стилем, складом, лігою та віком,
 * другі — лише за лігою та віком, тож і списки категорій під них різні.
 */
export const CATEGORY_SOURCE = {
  // Звичайні номінації конкурсу: з них будуються осі стилю, віку та складу.
  REGULAR: 'regular',
  // Спецномінації: їхні вікові категорії потрібні, щоб звузити список під
  // вік учасників номера.
  SPECIAL: 'special',
  // Звичайні номінації плюс ліги спеціальних: ліга спецномінації може не
  // траплятися більше ніде в конкурсі, а обрати її у формі заявник мусить —
  // інакше ця ліга не має id, за яким її можна попросити в сервера.
  REGULAR_WITH_SPECIAL_LEAGUES: 'regularWithSpecialLeagues',
} as const;

export type CategorySource =
  (typeof CATEGORY_SOURCE)[keyof typeof CATEGORY_SOURCE];

/**
 * Умова вибірки для кожного джерела, як вона лягає в SQL. `:leagueType` —
 * зв'язаний параметр запиту, тож у рядку немає жодного значення з поля.
 */
export const CATEGORY_SOURCE_CONDITIONS: Record<CategorySource, string> = {
  [CATEGORY_SOURCE.REGULAR]: 'n."isSpecial" = false',
  [CATEGORY_SOURCE.SPECIAL]: 'n."isSpecial" = true',
  [CATEGORY_SOURCE.REGULAR_WITH_SPECIAL_LEAGUES]:
    '(n."isSpecial" = false OR c."type" = :leagueType)',
};
