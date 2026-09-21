import type { CategoryType } from '../categories/category.model';

// Raw query-string parameters of the paged admin list.
export interface NominationPageQuery {
  page?: string;
  pageSize?: string;
  // Comma-separated category ids; a nomination must carry all of them.
  categoryIds?: string;
  q?: string;
  // A venue id, or UNASSIGNED_VENUE_QUERY_VALUE for nominations without one.
  venue?: string;
}

export interface VenueSummaryRow {
  categoryId: string;
  name: string;
  total: number;
  unassigned: number;
}

// Значення складу або ліги, що зустрічається в номінаціях конкурсу, і ціна,
// яку воно там має. `price` — null, коли номінації з цим значенням коштують
// по-різному (або якійсь із них ціну ще не задали).
export interface AxisPriceRow {
  categoryId: string;
  type: CategoryType;
  name: string;
  nominationCount: number;
  price: number | null;
}

export interface AxisPriceUpdateResult {
  updated: number;
}
