import { CATEGORY_TYPES, createCategoriesBulk } from './categories';
import type { Category, CategoryType } from './categories';
import type { ExitMode } from './categoryTemplates';
import type { AgeRange } from './ageRange';

export type AxisSelection = Record<CategoryType, Category[]>;

export function emptyAxisSelection(): AxisSelection {
  return CATEGORY_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {} as AxisSelection);
}

export const MAX_NOMINATIONS = 2000;

export interface DraftNomination {
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

export function draftCategory(
  name: string,
  type: CategoryType,
  range?: AgeRange,
): Category {
  const trimmed = name.trim();
  return {
    id: `${DRAFT_PREFIX}${type}:${trimmed}`,
    name: trimmed,
    type,
    ageFrom: range?.ageFrom ?? null,
    ageTo: range?.ageTo ?? null,
    sortOrder: 0,
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
  return {
    type: rest.slice(0, separator) as CategoryType,
    name: rest.slice(separator + 1),
  };
}

export function sameCategoryValue(
  a: { name: string; type: CategoryType },
  b: { name: string; type: CategoryType },
): boolean {
  return (
    a.type === b.type &&
    a.name.trim().toLowerCase() === b.name.trim().toLowerCase()
  );
}

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
 * Межі вікових значень у самому id чернетки не поміщаються, тому вони
 * дістаються з обраних осей: там лежать повні об'єкти категорій.
 */
export async function resolveDraftCategories(
  nominations: DraftNomination[],
  knownCategories: Category[] = [],
): Promise<DraftNomination[]> {
  const drafts = usedDraftCategories(nominations);
  if (drafts.length === 0) return nominations;

  const created = await createCategoriesBulk(
    drafts.map(({ id, name, type }) => {
      const known = knownCategories.find((c) => c.id === id);
      return {
        name,
        type,
        ageFrom: known?.ageFrom ?? undefined,
        ageTo: known?.ageTo ?? undefined,
      };
    }),
  );
  const resolved = new Map(drafts.map((d, i) => [d.id, created[i].id]));

  return nominations.map((n) => {
    const categoryIds = n.categoryIds.map((id) => resolved.get(id) ?? id);
    return {
      ...n,
      categoryIds,
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
