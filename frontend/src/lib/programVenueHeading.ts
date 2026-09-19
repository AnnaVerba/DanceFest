import type { PublicProgramRow } from './program';
import { VENUE_UNASSIGNED_LABEL } from './nominationVenue.constants';

// Every venue runs its own program, so a heading opens each venue's run of
// sections within a day. Null while the row continues the same venue, and
// when the competition has a single venue — the heading would say nothing.
export function venueHeadingAt(
  rows: PublicProgramRow[],
  index: number,
  venueNames: Map<string, string>,
): string | null {
  if (venueNames.size < 2) return null;
  const row = rows[index];
  const previous = rows[index - 1];
  if (
    previous &&
    previous.dayId === row.dayId &&
    previous.venueId === row.venueId
  ) {
    return null;
  }
  return (row.venueId && venueNames.get(row.venueId)) || VENUE_UNASSIGNED_LABEL;
}
