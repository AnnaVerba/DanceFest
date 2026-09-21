import type { NominationInput } from './nominations';
import type { CategoryType } from './categories';

// The venue is set after a nomination exists, so it is only part of an update;
// null takes the nomination off its venue.
export type NominationUpdateInput = Partial<NominationInput> & {
  venueId?: string | null;
};

export interface NominationPageQuery {
  page: number;
  pageSize: number;
  // A nomination must carry every one of these.
  categoryIds: string[];
  q: string;
  // A venue id, UNASSIGNED_VENUE_VALUE, or undefined for any venue.
  venue?: string;
}

export type VenueSummaryGroupBy = 'level' | 'age';

export interface VenueSummaryRow {
  categoryId: string;
  name: string;
  total: number;
  unassigned: number;
}

// Значення складу або ліги, що трапляється в номінаціях конкурсу, разом із
// ціною, яку воно там має. price — null, коли номінації з цим значенням
// коштують по-різному або ціни ще не мають.
export interface AxisPriceRow {
  categoryId: string;
  type: CategoryType;
  name: string;
  nominationCount: number;
  price: number | null;
}

export interface AxisPriceInput {
  categoryId: string;
  price: number;
}

export interface AxisPriceUpdateResult {
  updated: number;
}
