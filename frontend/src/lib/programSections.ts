import type { PublicProgramRow } from './program';
import type { Venue } from './venues';
import { formatParticipantNumbers } from './participantNumbers';
import {
  NO_VENUE_LABEL,
  PROGRAM_SECTION_ID_PREFIX,
  UNKNOWN_VENUE_LABEL,
} from './programSections.constants';
import type { ProgramSection, VenueProgram } from './programSections.types';

// The API returns one flat list; a `section` row opens each new section.
export function groupProgramSections(
  rows: PublicProgramRow[],
): ProgramSection[] {
  const sections: ProgramSection[] = [];
  rows.forEach((row, index) => {
    if (row.kind === 'section') {
      sections.push({
        id: `${PROGRAM_SECTION_ID_PREFIX}${index}`,
        head: row,
        rows: [],
      });
    } else {
      sections[sections.length - 1]?.rows.push(row);
    }
  });
  return sections;
}

// Venues in their configured order, sections without a venue last.
export function groupSectionsByVenue(
  sections: ProgramSection[],
  venues: Venue[],
): VenueProgram[] {
  const byVenue = new Map<string | null, ProgramSection[]>();
  for (const section of sections) {
    const key = section.head.venueId;
    byVenue.set(key, [...(byVenue.get(key) ?? []), section]);
  }
  const known: VenueProgram[] = venues
    .filter((venue) => byVenue.has(venue.id))
    .map((venue) => ({
      venueId: venue.id,
      name: venue.name,
      sections: byVenue.get(venue.id) ?? [],
    }));
  const knownIds = new Set(venues.map((venue) => venue.id));
  const unknown: VenueProgram[] = [...byVenue]
    .filter(([venueId]) => venueId !== null && !knownIds.has(venueId))
    .map(([venueId, list]) => ({
      venueId,
      name: UNKNOWN_VENUE_LABEL,
      sections: list,
    }));
  const withoutVenue = byVenue.get(null);
  return [
    ...known,
    ...unknown,
    ...(withoutVenue
      ? [{ venueId: null, name: NO_VENUE_LABEL, sections: withoutVenue }]
      : []),
  ];
}

// Search by performer (routine name is the performer's name) or number.
export function sectionMatchesQuery(
  section: ProgramSection,
  needle: string,
): boolean {
  return section.rows.some(
    (row) =>
      row.kind === 'exit' &&
      ((row.routineName ?? '').toLowerCase().includes(needle) ||
        formatParticipantNumbers(row.participantNumbers ?? []).includes(needle)),
  );
}
