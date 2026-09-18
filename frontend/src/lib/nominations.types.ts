import type { NominationInput } from './nominations';

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
