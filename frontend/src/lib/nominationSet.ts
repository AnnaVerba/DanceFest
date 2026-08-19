import type { ExitMode } from './categoryTemplates';

// Та сама стеля, що й на беку: п'ять типів по десять значень дають
// 100 000 комбінацій, і без межі це кладе і браузер, і базу.
export const MAX_NOMINATIONS = 2000;

/**
 * Рядок набору номінацій, поки він ще не збережений — і в редакторі шаблону,
 * і на кроці категорій майстра створення конкурсу. Ціна тут рядком, бо це
 * сире значення поля вводу: порожнє означає «ціни немає», а не нуль.
 */
export interface DraftNomination {
  // Відсортовані categoryIds — за нею впізнаємо вже відредагований рядок
  // при повторній генерації.
  signature: string;
  name: string;
  price: string;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  exitMode: ExitMode;
}

export function signatureOf(ids: string[]): string {
  return [...ids].sort().join('|');
}

/**
 * Підпис для рядка, що приїхав із сервера. Спецкатегорії різняться не складом
 * осей, а власним рядком — дві «Корони» на різних програмах мають однакові
 * categoryIds і без id злиплися б в один підпис.
 */
export function savedSignatureOf(nomination: {
  id: string;
  categoryIds: string[];
  isSpecial: boolean;
}): string {
  return nomination.isSpecial
    ? `special|${nomination.id}`
    : signatureOf(nomination.categoryIds);
}

export function pluralNominations(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'номінація';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'номінації';
  return 'номінацій';
}
