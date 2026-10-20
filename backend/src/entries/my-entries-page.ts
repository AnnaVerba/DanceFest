import type { PageParams } from '../common/pagination';
import {
  ALL_FILTER_VALUE,
  ENTRY_SEARCH_TEXT_SEPARATOR,
  ISO_MONTH_END,
  ISO_MONTH_START,
  ISO_YEAR_LENGTH,
  OWN_ENTRIES_BLOCK_KEY,
  SORT_ASCENDING,
  SORT_DESCENDING,
  TRAINER_NAME_COLLATOR_LOCALE,
} from './my-entries.constants';
import type {
  MyEntriesBlock,
  MyEntriesCompetitionOption,
  MyEntriesFilter,
  MyEntriesPage,
  MyEntriesSortOrder,
  MyEntriesBlockIdentity,
  MyEntryRow,
  MyEntryView,
} from './my-entries-page.interface';

interface ArrangedBlock<T extends MyEntryView> extends MyEntriesBlockIdentity {
  competitionId: string;
  entries: T[];
}

// Which block of a studio head's entries an entry falls in: the head's own
// (no trainer, or one they train themself), else its trainer's id. Anyone
// who is not a head has one block per competition.
function blockKeyOf(entry: MyEntryView, headUserId: string | null): string {
  if (headUserId === null) return OWN_ENTRIES_BLOCK_KEY;
  const trainerId = entry.instructorId;
  return !trainerId || trainerId === headUserId
    ? OWN_ENTRIES_BLOCK_KEY
    : trainerId;
}

function searchTextOf(entry: MyEntryView): string {
  return [
    ...entry.participants.map((p) => `${p.lastName} ${p.firstName}`),
    entry.routineName,
    entry.instructorName,
    entry.choreographer,
    entry.competitionName,
  ]
    .filter(Boolean)
    .join(ENTRY_SEARCH_TEXT_SEPARATOR)
    .toLowerCase();
}

// A missing date goes last whichever way the list runs.
function compareDates(
  a: string | null,
  b: string | null,
  direction: number,
): number {
  if (a === b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a < b ? -direction : direction;
}

// A competition still to come or running today.
function isUpcoming(entry: MyEntryView, today: string): boolean {
  const end = entry.competitionDateTo ?? entry.competitionDateFrom;
  return end !== null && end >= today;
}

// By competition start. 'nearest' puts the coming competitions first,
// soonest first, then the finished ones, most recent first. Stable, so
// entries keep their order within a competition.
function sortByCompetitionDate<T extends MyEntryView>(
  entries: T[],
  order: MyEntriesSortOrder,
  today: string,
): T[] {
  return [...entries].sort((a, b) => {
    if (order !== 'nearest') {
      return compareDates(
        a.competitionDateFrom,
        b.competitionDateFrom,
        order === 'newest' ? SORT_DESCENDING : SORT_ASCENDING,
      );
    }
    const upcomingA = isUpcoming(a, today);
    if (upcomingA !== isUpcoming(b, today)) return upcomingA ? -1 : 1;
    return compareDates(
      a.competitionDateFrom,
      b.competitionDateFrom,
      upcomingA ? SORT_ASCENDING : SORT_DESCENDING,
    );
  });
}

const yearOf = (entry: MyEntryView): string | null =>
  entry.competitionDateFrom?.slice(0, ISO_YEAR_LENGTH) ?? null;

const monthOf = (entry: MyEntryView): string | null =>
  entry.competitionDateFrom?.slice(ISO_MONTH_START, ISO_MONTH_END) ?? null;

function matchesFilter(entry: MyEntryView, filter: MyEntriesFilter): boolean {
  const needle = filter.q.trim().toLowerCase();
  return (
    (filter.competitionId === ALL_FILTER_VALUE ||
      entry.competitionId === filter.competitionId) &&
    (filter.year === ALL_FILTER_VALUE || yearOf(entry) === filter.year) &&
    (filter.month === ALL_FILTER_VALUE || monthOf(entry) === filter.month) &&
    (!needle || searchTextOf(entry).includes(needle))
  );
}

// Own block first, then one per trainer by name.
function compareBlocks(
  a: MyEntriesBlockIdentity,
  b: MyEntriesBlockIdentity,
): number {
  if (a.key === OWN_ENTRIES_BLOCK_KEY) return -1;
  if (b.key === OWN_ENTRIES_BLOCK_KEY) return 1;
  return (a.trainerName ?? '').localeCompare(
    b.trainerName ?? '',
    TRAINER_NAME_COLLATOR_LOCALE,
  );
}

// Competitions in the order they first appear, each split into blocks.
function arrange<T extends MyEntryView>(
  entries: T[],
  headUserId: string | null,
): ArrangedBlock<T>[] {
  const byCompetition = new Map<string, Map<string, ArrangedBlock<T>>>();
  for (const entry of entries) {
    let blocks = byCompetition.get(entry.competitionId);
    if (!blocks) {
      blocks = new Map();
      byCompetition.set(entry.competitionId, blocks);
    }
    const blockKey = blockKeyOf(entry, headUserId);
    const block = blocks.get(blockKey);
    if (block) {
      block.entries.push(entry);
    } else {
      blocks.set(blockKey, {
        competitionId: entry.competitionId,
        key: blockKey,
        trainerName:
          blockKey === OWN_ENTRIES_BLOCK_KEY ? null : entry.instructorName,
        entries: [entry],
      });
    }
  }
  return [...byCompetition.values()].flatMap((blocks) =>
    [...blocks.values()].sort(compareBlocks),
  );
}

function competitionOptions(
  entries: MyEntryView[],
): MyEntriesCompetitionOption[] {
  const byId = new Map<string, MyEntriesCompetitionOption>();
  for (const entry of entries) {
    if (!byId.has(entry.competitionId)) {
      byId.set(entry.competitionId, {
        id: entry.competitionId,
        name: entry.competitionName,
      });
    }
  }
  return [...byId.values()];
}

// Distinct non-null values, in order.
function distinctSorted(values: (string | null)[]): string[] {
  return [
    ...new Set(values.filter((value): value is string => value !== null)),
  ].sort();
}

// The months to offer: those of the chosen year, or of any year.
function monthOptions(entries: MyEntryView[], year: string): string[] {
  return distinctSorted(
    entries
      .filter((entry) => year === ALL_FILTER_VALUE || yearOf(entry) === year)
      .map(monthOf),
  );
}

// One page of «Мої заявки». `headUserId` is set only for a studio head —
// the only one whose entries split by trainer.
export function buildMyEntriesPage<T extends MyEntryView>(
  entries: T[],
  filter: MyEntriesFilter,
  headUserId: string | null,
  pageParams: PageParams,
  today: string,
): MyEntriesPage<T> {
  const sorted = sortByCompetitionDate(entries, filter.sort, today);
  const arranged = arrange(
    sorted.filter((entry) => matchesFilter(entry, filter)),
    headUserId,
  );
  const ordered = arranged.flatMap((block) =>
    block.entries.map((entry) => ({ entry, block })),
  );
  const pageSlice = ordered.slice(
    pageParams.offset,
    pageParams.offset + pageParams.limit,
  );
  const rows: MyEntryRow<T>[] = pageSlice.map(({ entry, block }) => ({
    ...entry,
    blockKey: block.key,
  }));
  const onPage = new Set(pageSlice.map(({ block }) => block));
  const blocks: MyEntriesBlock[] = arranged
    .filter((block) => onPage.has(block))
    .map((block) => ({
      competitionId: block.competitionId,
      blockKey: block.key,
      trainerName: block.trainerName,
      entries: block.entries.map((entry) => ({
        amount: entry.amount,
        musicFee: entry.musicFee,
        baseAmount: entry.baseAmount,
        routineName: entry.routineName,
        participants: entry.participants,
        participantAmounts: entry.participantAmounts,
      })),
    }));
  return {
    rows,
    total: ordered.length,
    page: pageParams.page,
    pageSize: pageParams.pageSize,
    competitions: competitionOptions(sorted),
    years: distinctSorted(sorted.map(yearOf)),
    months: monthOptions(sorted, filter.year),
    blocks,
  };
}
