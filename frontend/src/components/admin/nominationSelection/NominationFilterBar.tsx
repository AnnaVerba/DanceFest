import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AGE_CATEGORY_TYPE,
  LEAGUE_CATEGORY_TYPE,
  getCategories,
} from '../../../lib/categories';
import type { Category } from '../../../lib/categories';
import type { Venue } from '../../../lib/venues';
import { venueOptionLabel } from '../../../lib/nominationVenue';
import {
  UNASSIGNED_VENUE_VALUE,
  VENUE_FILTER_ALL_LABEL,
  VENUE_FILTER_ARIA_LABEL,
  VENUE_UNASSIGNED_LABEL,
} from '../../../lib/nominationVenue.constants';
import { queryKeys } from '../../../lib/queryKeys';
import { REFERENCE_STALE_TIME_MS } from '../../../lib/queryClient.constants';
import {
  AGE_FILTER_ALL_LABEL,
  AGE_FILTER_ARIA_LABEL,
  ANY_FILTER_VALUE,
  CLEAR_FILTERS_LABEL,
  LEAGUE_FILTER_ALL_LABEL,
  LEAGUE_FILTER_ARIA_LABEL,
  NAME_FILTER_ARIA_LABEL,
  NAME_FILTER_PLACEHOLDER,
  STYLE_CATEGORY_TYPE,
  STYLE_FILTER_ALL_LABEL,
  STYLE_FILTER_ARIA_LABEL,
} from './nominationFilters.constants';
import type { NominationSelection } from './nominationSelection.types';
import styles from './NominationFilterBar.module.css';

// Stable reference so the useMemo below doesn't see a "new" array on every
// render while the query has no data yet.
const EMPTY_CATEGORIES: Category[] = [];

interface NominationFilterBarProps {
  selection: NominationSelection;
  // When given (and non-empty), adds a filter by venue.
  venues?: Venue[];
}

export default function NominationFilterBar({
  selection,
  venues,
}: NominationFilterBarProps) {
  const { filters } = selection;

  // A venue deleted while it is the active filter would leave the select
  // pointing at nothing and the list empty.
  const filteredVenueGone =
    venues !== undefined &&
    filters.venueValue !== ANY_FILTER_VALUE &&
    filters.venueValue !== UNASSIGNED_VENUE_VALUE &&
    !venues.some((venue) => venue.id === filters.venueValue);
  useEffect(() => {
    if (filteredVenueGone) selection.setVenueValue(ANY_FILTER_VALUE);
  }, [filteredVenueGone, selection]);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => getCategories(),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;
  const byType = useMemo(
    () => ({
      styles: categories.filter((c) => c.type === STYLE_CATEGORY_TYPE),
      leagues: categories.filter((c) => c.type === LEAGUE_CATEGORY_TYPE),
      ages: categories.filter((c) => c.type === AGE_CATEGORY_TYPE),
    }),
    [categories],
  );

  return (
    <div className={styles.filterBar}>
      <select
        className={styles.select}
        aria-label={STYLE_FILTER_ARIA_LABEL}
        value={filters.styleId}
        onChange={(e) => selection.setStyleId(e.target.value)}
      >
        <option value={ANY_FILTER_VALUE}>{STYLE_FILTER_ALL_LABEL}</option>
        {byType.styles.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        aria-label={LEAGUE_FILTER_ARIA_LABEL}
        value={filters.leagueId}
        onChange={(e) => selection.setLeagueId(e.target.value)}
      >
        <option value={ANY_FILTER_VALUE}>{LEAGUE_FILTER_ALL_LABEL}</option>
        {byType.leagues.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        aria-label={AGE_FILTER_ARIA_LABEL}
        value={filters.ageId}
        onChange={(e) => selection.setAgeId(e.target.value)}
      >
        <option value={ANY_FILTER_VALUE}>{AGE_FILTER_ALL_LABEL}</option>
        {byType.ages.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <input
        className={styles.search}
        type="text"
        placeholder={NAME_FILTER_PLACEHOLDER}
        aria-label={NAME_FILTER_ARIA_LABEL}
        value={filters.query}
        onChange={(e) => selection.setQuery(e.target.value)}
      />
      {venues && venues.length > 0 && (
        <select
          className={styles.select}
          aria-label={VENUE_FILTER_ARIA_LABEL}
          value={filters.venueValue}
          onChange={(e) => selection.setVenueValue(e.target.value)}
        >
          <option value={ANY_FILTER_VALUE}>{VENUE_FILTER_ALL_LABEL}</option>
          <option value={UNASSIGNED_VENUE_VALUE}>{VENUE_UNASSIGNED_LABEL}</option>
          {venues.map((venue) => (
            <option key={venue.id} value={venue.id}>
              {venueOptionLabel(venue)}
            </option>
          ))}
        </select>
      )}
      {selection.hasActiveFilter && (
        <button type="button" className={styles.btnLink} onClick={selection.clearFilters}>
          {CLEAR_FILTERS_LABEL}
        </button>
      )}
    </div>
  );
}
