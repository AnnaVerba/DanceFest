import {
  CATEGORY_TYPES,
  LEAGUE_CATEGORY_TYPE,
  createCategoriesBulk,
} from './categories';
import type { Category, CategoryType } from './categories';
import type { ExitMode } from './categoryTemplates';
import type { CategoryRange } from './categoryRange';
import {
  LISTED_NOMINATIONS_ELLIPSIS,
  LISTED_NOMINATIONS_SEPARATOR,
  MAX_LISTED_NOMINATIONS,
  NOMINATION_LEAGUE_REQUIRED_MESSAGE,
} from './nominationLeague.constants';

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
  specialName?: string;
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
  range?: CategoryRange,
): Category {
  const trimmed = name.trim();
  return {
    id: `${DRAFT_PREFIX}${type}:${trimmed}`,
    name: trimmed,
    type,
    rangeFrom: range?.rangeFrom ?? null,
    rangeTo: range?.rangeTo ?? null,
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

export interface ResolvedDraftCategories {
  nominations: DraftNomination[];
  // draft id → id збереженої категорії. Потрібен не лише номінаціям: ціни
  // осей теж посилаються на категорії за id, і без цієї мапи ціна щойно
  // доданого «Квартет» поїхала б на сервер із draft-id.
  idByDraftId: Map<string, string>;
}

/**
 * Межі вікових значень у самому id чернетки не поміщаються, тому вони
 * дістаються з обраних осей: там лежать повні об'єкти категорій.
 */
export async function resolveDraftCategories(
  nominations: DraftNomination[],
  knownCategories: Category[] = [],
): Promise<ResolvedDraftCategories> {
  const drafts = usedDraftCategories(nominations);
  if (drafts.length === 0) {
    return { nominations, idByDraftId: new Map() };
  }

  const created = await createCategoriesBulk(
    drafts.map(({ id, name, type }) => {
      const known = knownCategories.find((c) => c.id === id);
      return {
        name,
        type,
        rangeFrom: known?.rangeFrom ?? undefined,
        rangeTo: known?.rangeTo ?? undefined,
      };
    }),
  );
  const resolved = new Map(drafts.map((d, i) => [d.id, created[i].id]));

  return {
    idByDraftId: resolved,
    nominations: nominations.map((n) => {
      const categoryIds = n.categoryIds.map((id) => resolved.get(id) ?? id);
      return {
        ...n,
        categoryIds,
        signature: n.isSpecial ? n.signature : signatureOf(categoryIds),
      };
    }),
  };
}

// A league is either a saved category (its id is in `leagueIds`) or a draft
// one not yet created, whose type is encoded in the id itself.
export function nominationsWithoutLeague(
  nominations: DraftNomination[],
  leagueIds: ReadonlySet<string>,
): DraftNomination[] {
  return nominations.filter(
    (n) =>
      !n.categoryIds.some(
        (id) =>
          leagueIds.has(id) ||
          parseDraftCategory(id)?.type === LEAGUE_CATEGORY_TYPE,
      ),
  );
}

export function missingLeagueMessage(nominations: DraftNomination[]): string {
  const listed = nominations
    .slice(0, MAX_LISTED_NOMINATIONS)
    .map((n) => n.name)
    .join(LISTED_NOMINATIONS_SEPARATOR);
  const more =
    nominations.length > MAX_LISTED_NOMINATIONS
      ? `${LISTED_NOMINATIONS_SEPARATOR}${LISTED_NOMINATIONS_ELLIPSIS}`
      : '';
  return `${NOMINATION_LEAGUE_REQUIRED_MESSAGE}: ${listed}${more}`;
}

const NOMINATION_NOUNS = ['номінація', 'номінації', 'номінацій'] as const;

export function pluralNominations(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return NOMINATION_NOUNS[0];
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return NOMINATION_NOUNS[1];
  return NOMINATION_NOUNS[2];
}
