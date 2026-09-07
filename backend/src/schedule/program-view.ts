import { AWARD_ITEM, isManualRow } from './section-item-type';
import type { SectionView, SectionItemView } from './section-view';

export interface ProgramAudienceIdentity {
  ownIds: string[];
  studentIds: string[];
}

export interface PublicProgramRow {
  kind: 'section' | 'group' | 'exit' | 'award' | 'break' | 'gala';
  label: string | null;
  time: string;
  dayId: string;
  dayDate: string | null;
  venueId: string | null;
  // Set only on `exit` rows — the program lists every performance with the
  // participant number(s), the routine, the studio and coach, and its
  // on-stage length (see docs/AppDescription.docx).
  participantNumbers?: (number | null)[];
  routineName?: string | null;
  studioName?: string | null;
  choreographer?: string | null;
  durationSeconds?: number | null;
}

export interface MineExitRow {
  time: string;
  number: number;
  participantNumbers: (number | null)[];
  nomination: string;
  groupLabel: string;
  isMine: boolean;
  isMyStudent: boolean;
  performerName: string;
}

export interface MineProgramSection {
  id: string;
  name: string;
  time: string;
  dayId: string;
  venueId: string | null;
  exits: MineExitRow[];
}

export interface MineProgram {
  sections: MineProgramSection[];
  totals: { mine: number; students: number };
}

export interface ExtendedProgramItem {
  type: SectionItemView['type'];
  time: string;
  groupLabel: string | null;
  number: number | null;
  participantNumbers: (number | null)[];
  nomination: string | null;
  routineName: string | null;
  studioName: string | null;
  choreographer: string | null;
  effectiveDurationSeconds: number | null;
  hasTrack: boolean;
}

export interface ExtendedProgramSection {
  id: string;
  name: string;
  time: string;
  dayId: string;
  venueId: string | null;
  items: ExtendedProgramItem[];
}

function groupLabelOf(item: SectionItemView): string {
  return item.mergedGroupLabel ?? item.exit?.nomination ?? '';
}

function overlaps(a: string[], b: Set<string>): boolean {
  return a.some((id) => b.has(id));
}

// The festival programme (docs/AppDescription.docx): section starts,
// nomination-block headers with a clock time, every performance as an
// `exit` row (participant number, routine, studio + coach, on-stage
// length), and the award. Same for everyone; the personal cut just flags
// the viewer's own rows.
export function buildPublicProgram(
  sections: SectionView[],
): PublicProgramRow[] {
  const rows: PublicProgramRow[] = [];

  for (const section of sections) {
    rows.push({
      kind: 'section',
      label: section.name,
      time: section.items[0]?.time ?? `${section.startTime}:00`,
      dayId: section.dayId,
      dayDate: section.dayDate,
      venueId: section.venueId,
    });

    let runLabel: string | null = null;
    for (const item of section.items) {
      if (item.type === AWARD_ITEM) {
        rows.push({
          kind: 'award',
          label: null,
          time: item.time,
          dayId: section.dayId,
          dayDate: section.dayDate,
          venueId: section.venueId,
        });
        continue;
      }
      if (isManualRow(item.type)) {
        runLabel = null;
        rows.push({
          kind: item.type as 'break' | 'gala',
          label: item.label,
          time: item.time,
          dayId: section.dayId,
          dayDate: section.dayDate,
          venueId: section.venueId,
        });
        continue;
      }
      const label = groupLabelOf(item);
      if (label !== runLabel) {
        runLabel = label;
        rows.push({
          kind: 'group',
          label,
          time: item.time,
          dayId: section.dayId,
          dayDate: section.dayDate,
          venueId: section.venueId,
        });
      }
      rows.push({
        kind: 'exit',
        label: null,
        time: item.time,
        dayId: section.dayId,
        dayDate: section.dayDate,
        venueId: section.venueId,
        participantNumbers: item.exit?.participantNumbers ?? [],
        routineName: item.exit?.routineName ?? null,
        studioName: item.exit?.studioName ?? null,
        choreographer: item.exit?.choreographer ?? null,
        durationSeconds: item.durationSeconds,
      });
    }
  }

  return rows;
}

// Personal projection: the same service rows plus only the caller's own
// exits and their roster students' exits, each flagged server-side.
export function buildMineProgram(
  sections: SectionView[],
  identity: ProgramAudienceIdentity,
): MineProgram {
  const own = new Set(identity.ownIds);
  const students = new Set(identity.studentIds);
  let mine = 0;
  let studentCount = 0;

  const outSections: MineProgramSection[] = sections.map((section) => {
    const exits: MineExitRow[] = [];
    for (const item of section.items) {
      if (item.type === AWARD_ITEM || item.exit == null) continue;
      const ids = [
        ...(item.exit.participantId ? [item.exit.participantId] : []),
        ...item.exit.participantIds,
      ];
      const isMine = overlaps(ids, own);
      const isMyStudent = !isMine && overlaps(ids, students);
      if (!isMine && !isMyStudent) continue;
      if (isMine) mine += 1;
      if (isMyStudent) studentCount += 1;
      exits.push({
        time: item.time,
        number: item.exit.number,
        participantNumbers: item.exit.participantNumbers,
        nomination: item.exit.nomination,
        groupLabel: groupLabelOf(item),
        isMine,
        isMyStudent,
        performerName: item.exit.routineName,
      });
    }
    return {
      id: section.id,
      name: section.name,
      time: section.items[0]?.time ?? `${section.startTime}:00`,
      dayId: section.dayId,
      venueId: section.venueId,
      exits,
    };
  });

  return {
    sections: outSections.filter((s) => s.exits.length > 0),
    totals: { mine, students: studentCount },
  };
}

// Working document for the sound engineer: every position, full detail.
export function buildExtendedProgram(
  sections: SectionView[],
): ExtendedProgramSection[] {
  return sections.map((section) => ({
    id: section.id,
    name: section.name,
    time: section.items[0]?.time ?? `${section.startTime}:00`,
    dayId: section.dayId,
    venueId: section.venueId,
    items: section.items.map((item) => ({
      type: item.type,
      time: item.time,
      groupLabel:
        item.type === AWARD_ITEM
          ? null
          : isManualRow(item.type)
            ? item.label
            : groupLabelOf(item),
      number: item.exit?.number ?? null,
      participantNumbers: item.exit?.participantNumbers ?? [],
      nomination: item.exit?.nomination ?? null,
      routineName: item.exit?.routineName ?? null,
      studioName: item.exit?.studioName ?? null,
      choreographer: item.exit?.choreographer ?? null,
      effectiveDurationSeconds: item.durationSeconds,
      hasTrack: item.exit?.musicName != null,
    })),
  }));
}
