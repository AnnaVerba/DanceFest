import { CATEGORY_TYPES, createCategoriesBulk } from './categories';
import type { Category, CategoryType } from './categories';
import type { ExitMode } from './categoryTemplates';

/**
 * Обрані значення осей. Живе в сторінці, а не в конструкторі: у майстрі
 * створення конкурсу крок із категоріями розмонтовується, щойно людина йде
 * далі, і разом із ним гинули б усі щойно додані осі.
 */
export type AxisSelection = Record<CategoryType, Category[]>;

export function emptyAxisSelection(): AxisSelection {
  return CATEGORY_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {} as AxisSelection);
}

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

const DRAFT_PREFIX = 'draft:';

/**
 * Значення осі, яке людина щойно набрала, живе лише в браузері до збереження
 * набору. Інакше кинутий на півдорозі майстер лишає по собі рядки в спільному
 * довіднику, які потім бачать усі організатори.
 *
 * Тип і назва закодовані в самому id, і це не прикраса: чернетку, використану
 * лише у спецкатегорії, більше нема звідки дістати — вибір осей про неї не
 * знає, а стан модалки зникає разом із нею.
 */
export function draftCategory(name: string, type: CategoryType): Category {
  const trimmed = name.trim();
  return {
    id: `${DRAFT_PREFIX}${type}:${trimmed}`,
    name: trimmed,
    type,
    createdAt: '',
  };
}

export function isDraftCategory(id: string): boolean {
  return id.startsWith(DRAFT_PREFIX);
}

function parseDraftCategory(
  id: string,
): { name: string; type: CategoryType } | null {
  if (!isDraftCategory(id)) return null;
  const rest = id.slice(DRAFT_PREFIX.length);
  const separator = rest.indexOf(':');
  if (separator === -1) return null;
  // Назва може містити двокрапку, тип — ні, тому ріжемо лише по першій.
  return {
    type: rest.slice(0, separator) as CategoryType,
    name: rest.slice(separator + 1),
  };
}

/** Чернетка й наявне значення — те саме, якщо збігаються тип і назва без огляду на регістр. */
export function sameCategoryValue(
  a: { name: string; type: CategoryType },
  b: { name: string; type: CategoryType },
): boolean {
  return (
    a.type === b.type &&
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
  );
}

/**
 * Чернетки, які реально використані в наборі. Значення, додане на вісь і потім
 * прибране, до сервера не їде — воно нікуди не потрапило.
 */
export function usedDraftCategories(
  nominations: DraftNomination[],
): { id: string; name: string; type: CategoryType }[] {
  const seen = new Set<string>();
  const drafts: { id: string; name: string; type: CategoryType }[] = [];

  for (const id of nominations.flatMap((n) => n.categoryIds)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const parsed = parseDraftCategory(id);
    if (parsed) drafts.push({ id, ...parsed });
  }
  return drafts;
}

/**
 * Заводить у спільному довіднику всі чернетки набору й повертає той самий
 * набір зі справжніми id. Викликається рівно перед збереженням: до цієї миті
 * набрані значення нікуди не записані.
 */
export async function resolveDraftCategories(
  nominations: DraftNomination[],
): Promise<DraftNomination[]> {
  const drafts = usedDraftCategories(nominations);
  if (drafts.length === 0) return nominations;

  const created = await createCategoriesBulk(
    drafts.map(({ name, type }) => ({ name, type })),
  );
  const resolved = new Map(drafts.map((d, i) => [d.id, created[i].id]));

  return nominations.map((n) => {
    const categoryIds = n.categoryIds.map((id) => resolved.get(id) ?? id);
    return {
      ...n,
      categoryIds,
      // Підпис рахується зі складу осей, тож після підміни він інший.
      signature: n.isSpecial ? n.signature : signatureOf(categoryIds),
    };
  });
}

export function pluralNominations(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'номінація';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'номінації';
  return 'номінацій';
}
