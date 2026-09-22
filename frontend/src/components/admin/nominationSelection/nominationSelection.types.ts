import type { NominationBulkSelector } from '../../../lib/nominations';
import type { NominationPageQuery } from '../../../lib/nominations.types';

export interface NominationFilterState {
  styleId: string;
  leagueId: string;
  ageId: string;
  query: string;
  // A venue id, UNASSIGNED_VENUE_VALUE, or ANY_FILTER_VALUE.
  venueValue: string;
}

// Filters, the current page and the selection of a server-paged nomination
// list. "Select all filtered" covers every page, so it is a mode rather than
// a set of ids.
export interface NominationSelection {
  filters: NominationFilterState;
  setStyleId(id: string): void;
  setLeagueId(id: string): void;
  setAgeId(id: string): void;
  setQuery(query: string): void;
  setVenueValue(value: string): void;
  clearFilters(): void;
  hasActiveFilter: boolean;
  page: number;
  setPage(page: number): void;
  pageQuery: NominationPageQuery;
  allFilteredSelected: boolean;
  selectedIds: Set<string>;
  isSelected(id: string): boolean;
  selectedCount(total: number): number;
  toggleSelected(id: string): void;
  toggleSelectAll(): void;
  deselect(id: string): void;
  clearSelection(): void;
  buildBulkSelector(): NominationBulkSelector;
}
