import { VENUE_UNASSIGNED_LABEL } from './nominationVenue.constants';
import { PROGRAM_HEADING_SEPARATOR } from './programHeading.constants';
import type { ProgramPlace } from './programPlace.types';

// Every venue runs its own program per day, so a heading opens the first
// row of each program — whenever the day or the venue changes.
export function opensProgram(
  current: ProgramPlace,
  previous: ProgramPlace | undefined,
): boolean {
  return (
    !previous ||
    previous.dayId !== current.dayId ||
    previous.venueId !== current.venueId
  );
}

// «5 вересня · Тераса»; just the day when the competition has no venues.
export function programHeading(
  dayLabel: string,
  venueId: string | null,
  venueNames: Map<string, string>,
): string {
  if (venueNames.size === 0) return dayLabel;
  const venue = (venueId && venueNames.get(venueId)) || VENUE_UNASSIGNED_LABEL;
  return `${dayLabel}${PROGRAM_HEADING_SEPARATOR}${venue}`;
}
