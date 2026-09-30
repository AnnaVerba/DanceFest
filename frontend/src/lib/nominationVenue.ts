import type { Venue } from './venues';
import type { VenueSummaryRow } from './nominations.types';
import { NO_VENUE_CHOICE, UNASSIGNED_VENUE_VALUE } from './nominationVenue.constants';

// The venue a whole category stands on — nothing when its nominations are
// spread over several venues or some still lack one.
export function summaryVenueChoice(row: VenueSummaryRow): string {
  return row.venueIds.length === 1 && row.unassigned === 0
    ? row.venueIds[0]
    : NO_VENUE_CHOICE;
}

export function toVenueId(selectValue: string): string | null {
  return selectValue === UNASSIGNED_VENUE_VALUE ? null : selectValue;
}

export function toVenueSelectValue(venueId: string | null): string {
  return venueId ?? UNASSIGNED_VENUE_VALUE;
}

export function venueOptionLabel(venue: Venue): string {
  return `${venue.name} (${venue.nominationCount})`;
}
