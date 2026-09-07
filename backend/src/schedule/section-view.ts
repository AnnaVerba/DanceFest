import { LINEUP_LABELS } from '../entries/lineup';
import { Entry } from '../entries/entry.model';
import { Section } from './section.model';
import { SectionItem } from './section-item.model';
import { PERFORMANCE_ITEM, isManualRow } from './section-item-type';
import { AWARD_ITEM } from './section-item-type';
import type { SectionItemType } from './section-item-type';
import { calculateSchedule } from './calculate-schedule';
import type { ScheduleItemInput } from './calculate-schedule';
import { formatHhMmSs, parseHhMm } from './section-time';

export interface SectionExitView {
  entryId: string;
  number: number;
  // Per-competition participant number, one per dancer in `participantIds`
  // order; null for a dancer with no number yet or an organizer-typed entry.
  // This is the number the program shows.
  participantNumbers: (number | null)[];
  nomination: string;
  routineName: string;
  ageCategory: string | null;
  league: string | null;
  lineup: string | null;
  improv: boolean;
  studioName: string | null;
  choreographer: string | null;
  participantId: string | null;
  participantIds: string[];
  musicName: string | null;
}

// entry id -> its participant numbers, so buildSectionView stays a pure
// function while the service loads the numbers.
export type ParticipantNumbersByEntry = Map<string, (number | null)[]>;

export interface SectionItemView {
  id: string;
  type: SectionItemType;
  nominationGroupKey: string | null;
  mergedGroupLabel: string | null;
  // Text of a manually inserted break / gala row.
  label: string | null;
  sortOrder: number;
  time: string;
  startTimeSeconds: number;
  durationSeconds: number | null;
  exit: SectionExitView | null;
}

export interface SectionView {
  id: string;
  competitionId: string;
  dayId: string;
  dayDate: string | null;
  venueId: string | null;
  name: string;
  startTime: string;
  pauseSeconds: number;
  sortOrder: number;
  items: SectionItemView[];
}

// The lightweight section list the editor needs where a paginated page is
// not enough: the move-exit target menu and the day-wide reorder both need
// every section of the day, but never their items.
export interface SectionSummaryView {
  id: string;
  name: string;
  dayId: string;
  venueId: string | null;
  sortOrder: number;
}

export function isGroupImprov(entry: Entry): boolean {
  return entry.improv && entry.lineup === LINEUP_LABELS.GROUP;
}

// A `performance` row whose entry was cancelled (entryId nulled on delete)
// carries no time and is dropped from the running order until the next
// recalculate removes it for good. Award and manual rows are always live.
export function isLiveItem(item: SectionItem): boolean {
  return (
    item.type === AWARD_ITEM || isManualRow(item.type) || item.entry != null
  );
}

function toExitView(
  entry: Entry,
  participantNumbers: (number | null)[],
): SectionExitView {
  return {
    entryId: entry.id,
    number: entry.number,
    participantNumbers,
    nomination: entry.nomination,
    routineName: entry.routineName,
    ageCategory: entry.ageCategory,
    league: entry.league,
    lineup: entry.lineup,
    improv: entry.improv,
    studioName: entry.studioName,
    choreographer: entry.choreographer,
    participantId: entry.participantId,
    participantIds: entry.participantIds ?? [],
    musicName: entry.musicName,
  };
}

// Turns a loaded section (items ordered by sortOrder, each `performance`
// item with its `entry` populated) into the shape the API returns: every
// position already carries its on-stage time, computed here and nowhere
// on the client.
export function buildSectionView(
  section: Section,
  orderedItems: SectionItem[],
  participantNumbers: ParticipantNumbersByEntry = new Map(),
): SectionView {
  const liveItems = orderedItems.filter(isLiveItem);
  const startTimeSeconds = parseHhMm(section.startTime) ?? 0;

  const scheduleInputs: ScheduleItemInput[] = liveItems.map((item) => ({
    id: item.id,
    type: item.type,
    durationSeconds: item.durationSeconds ?? 0,
    nominationGroupKey: item.nominationGroupKey,
    isGroupImprov:
      item.type === PERFORMANCE_ITEM && item.entry != null
        ? isGroupImprov(item.entry)
        : false,
  }));

  const scheduled = calculateSchedule({
    startTimeSeconds,
    pauseSeconds: section.pauseSeconds,
    items: scheduleInputs,
  });
  const startById = new Map(scheduled.map((s) => [s.id, s.startTimeSeconds]));

  const items: SectionItemView[] = liveItems.map((item) => {
    const seconds = startById.get(item.id) ?? startTimeSeconds;
    return {
      id: item.id,
      type: item.type,
      nominationGroupKey: item.nominationGroupKey,
      mergedGroupLabel: item.mergedGroupLabel,
      label: item.label,
      sortOrder: item.sortOrder,
      time: formatHhMmSs(seconds),
      startTimeSeconds: seconds,
      durationSeconds: item.durationSeconds,
      exit:
        item.entry != null
          ? toExitView(item.entry, participantNumbers.get(item.entry.id) ?? [])
          : null,
    };
  });

  return {
    id: section.id,
    competitionId: section.competitionId,
    dayId: section.dayId,
    dayDate: section.day?.date ?? null,
    venueId: section.venueId,
    name: section.name,
    startTime: section.startTime,
    pauseSeconds: section.pauseSeconds,
    sortOrder: section.sortOrder,
    items,
  };
}
