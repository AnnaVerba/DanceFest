import type { Venue } from './venues';
import { UNASSIGNED_VENUE_VALUE } from './nominationVenue.constants';

export function toVenueId(selectValue: string): string | null {
  return selectValue === UNASSIGNED_VENUE_VALUE ? null : selectValue;
}

export function toVenueSelectValue(venueId: string | null): string {
  return venueId ?? UNASSIGNED_VENUE_VALUE;
}

export function venueOptionLabel(venue: Venue): string {
  return `${venue.name} (${venue.nominationCount})`;
}
