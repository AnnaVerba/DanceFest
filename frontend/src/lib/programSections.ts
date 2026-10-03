import type { MineProgramSection, PublicProgramRow } from './program';
import type { MineMark, SectionMarks } from './programHighlight.types';
import type { Venue } from './venues';
import { formatParticipantNumbers } from './participantNumbers';
import {
  NO_VENUE_LABEL,
  PROGRAM_SECTION_ID_PREFIX,
  SECTION_MATCH_KEY_SEPARATOR,
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
        id: `${PROGRAM_SECTION_ID_PREFIX}${row.sectionId ?? index}`,
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

function sectionMatchKey(
  dayId: string,
  venueId: string | null,
  name: string | null,
  time: string,
): string {
  return [dayId, venueId ?? '', name ?? '', time].join(
    SECTION_MATCH_KEY_SEPARATOR,
  );
}

// The viewer's own cut, keyed so each public section can find its part.
export function indexMineSections(
  sections: MineProgramSection[],
): Map<string, MineProgramSection> {
  return new Map(
    sections.map((section) => [
      sectionMatchKey(section.dayId, section.venueId, section.name, section.time),
      section,
    ]),
  );
}

function strongerMark(a: MineMark | undefined, b: MineMark): MineMark {
  return a === 'mine' || b === 'mine' ? 'mine' : 'student';
}

// Marks every nomination of a public section that holds one of the viewer's
// exits. An exit is found by its time — unique within a section — and marks
// the nomination row it runs under.
export function markMineGroups(
  section: ProgramSection,
  mineByKey: Map<string, MineProgramSection>,
): SectionMarks {
  const groups = new Map<number, MineMark>();
  const { head } = section;
  const mine = mineByKey.get(
    sectionMatchKey(head.dayId, head.venueId, head.label, head.time),
  );
  if (!mine) return { section: null, groups };

  const markByTime = new Map(
    mine.exits.map((exit): [string, MineMark] => [
      exit.time,
      exit.isMine ? 'mine' : 'student',
    ]),
  );
  let groupIndex: number | null = null;
  section.rows.forEach((row, index) => {
    if (row.kind === 'group') groupIndex = index;
    const mark = row.kind === 'exit' ? markByTime.get(row.time) : undefined;
    if (mark && groupIndex !== null) {
      groups.set(groupIndex, strongerMark(groups.get(groupIndex), mark));
    }
  });

  // From the viewer's own cut, not the rows: a section's performances load
  // only once it is opened, yet its header is marked from the start.
  const sectionMark: MineMark | null =
    mine.exits.length === 0
      ? null
      : mine.exits.some((exit) => exit.isMine)
        ? 'mine'
        : 'student';
  return { section: sectionMark, groups };
}
