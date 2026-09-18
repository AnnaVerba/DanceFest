import { useMemo, useState } from 'react';
import type { NominationBulkSelector } from '../../../lib/nominations';
import type { NominationPageQuery } from '../../../lib/nominations.types';
import { toVenueId } from '../../../lib/nominationVenue';
import { ANY_FILTER_VALUE, FIRST_PAGE } from './nominationFilters.constants';
import type {
  NominationFilterState,
  NominationSelection,
} from './nominationSelection.types';

const EMPTY_FILTERS: NominationFilterState = {
  styleId: ANY_FILTER_VALUE,
  leagueId: ANY_FILTER_VALUE,
  ageId: ANY_FILTER_VALUE,
  query: ANY_FILTER_VALUE,
  venueValue: ANY_FILTER_VALUE,
};

export function useNominationSelection(pageSize: number): NominationSelection {
  const [filters, setFilters] = useState<NominationFilterState>(EMPTY_FILTERS);
  const [page, setPage] = useState(FIRST_PAGE);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [allFilteredSelected, setAllFilteredSelected] = useState(false);

  const clearSelection = () => {
    setSelectedIds(new Set());
    setAllFilteredSelected(false);
  };

  // A filter change redefines the list, so the selection and the page no
  // longer mean anything.
  const patchFilters = (patch: Partial<NominationFilterState>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(FIRST_PAGE);
    clearSelection();
  };

  const categoryIds = useMemo(
    () =>
      [filters.styleId, filters.leagueId, filters.ageId].filter(
        (id) => id !== ANY_FILTER_VALUE,
      ),
    [filters.styleId, filters.leagueId, filters.ageId],
  );
  const trimmedQuery = filters.query.trim();
  const hasVenueFilter = filters.venueValue !== ANY_FILTER_VALUE;

  const pageQuery = useMemo<NominationPageQuery>(
    () => ({
      page,
      pageSize,
      categoryIds,
      q: trimmedQuery,
      venue: hasVenueFilter ? filters.venueValue : undefined,
    }),
    [page, pageSize, categoryIds, trimmedQuery, hasVenueFilter, filters.venueValue],
  );

  const buildBulkSelector = (): NominationBulkSelector =>
    allFilteredSelected
      ? {
          filter: {
            categoryIds: categoryIds.length > 0 ? categoryIds : undefined,
            q: trimmedQuery || undefined,
            venueId: hasVenueFilter ? toVenueId(filters.venueValue) : undefined,
          },
        }
      : { nominationIds: [...selectedIds] };

  return {
    filters,
    setStyleId: (styleId) => patchFilters({ styleId }),
    setLeagueId: (leagueId) => patchFilters({ leagueId }),
    setAgeId: (ageId) => patchFilters({ ageId }),
    setQuery: (query) => patchFilters({ query }),
    setVenueValue: (venueValue) => patchFilters({ venueValue }),
    clearFilters: () => patchFilters(EMPTY_FILTERS),
    hasActiveFilter: categoryIds.length > 0 || trimmedQuery !== '' || hasVenueFilter,
    page,
    setPage,
    pageQuery,
    allFilteredSelected,
    selectedIds,
    isSelected: (id) => allFilteredSelected || selectedIds.has(id),
    selectedCount: (total) => (allFilteredSelected ? total : selectedIds.size),
    toggleSelected: (id) =>
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    toggleSelectAll: () => {
      const selectAll = !allFilteredSelected;
      clearSelection();
      setAllFilteredSelected(selectAll);
    },
    // A row edited on its own (e.g. moved to another venue) may drop out of
    // the filter; keeping it selected would let the next bulk action move it
    // again behind the organizer's back.
    deselect: (id) =>
      setSelectedIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      }),
    clearSelection,
    buildBulkSelector,
  };
}
