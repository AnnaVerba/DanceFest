import type { EntryParticipant } from './entry-participant.interface';
import type { ParticipantAmount } from './participant-amount.interface';
import type { MY_ENTRIES_SORT_ORDERS } from './my-entries.constants';

export type MyEntriesSortOrder = (typeof MY_ENTRIES_SORT_ORDERS)[number];

// What the page builder reads off one of a person's entries.
export interface MyEntryView {
  id: string;
  competitionId: string;
  competitionName: string | null;
  competitionDateFrom: string | null;
  competitionDateTo: string | null;
  instructorId: string | null;
  instructorName: string | null;
  choreographer: string | null;
  amount: number;
  // The extra-time fee for a track over the limit — part of amount.
  musicFee: number;
  // amount without musicFee — the nomination alone.
  baseAmount: number;
  // The number's own name — all that names a group registered by headcount.
  routineName: string;
  // Optional title of a solo, duo or trio number.
  routineTitle: string | null;
  participants: EntryParticipant[];
  participantAmounts: ParticipantAmount[];
}

// The cost side of an entry — enough for a block's totals.
export interface PricedEntryView {
  amount: number;
  // The extra-time fee for a track over the limit — part of amount.
  musicFee: number;
  // amount without musicFee — the nomination alone.
  baseAmount: number;
  routineName: string;
  participants: EntryParticipant[];
  participantAmounts: ParticipantAmount[];
}

export interface MyEntriesCompetitionOption {
  id: string;
  name: string | null;
}

// Which block an entry is shown in: a studio head's own (trainerName null)
// or one trainer's.
export interface MyEntriesBlockIdentity {
  key: string;
  trainerName: string | null;
}

// One block of a competition's entries — a head's own or one trainer's;
// everyone else has one per competition. Its entries span the whole filtered
// list, so totals stay whole when the block runs over a page break.
export interface MyEntriesBlock {
  competitionId: string;
  blockKey: string;
  trainerName: string | null;
  entries: PricedEntryView[];
}

export type MyEntryRow<T extends MyEntryView> = T & { blockKey: string };

export interface MyEntriesPage<T extends MyEntryView> {
  // In display order: competition, then the head's own block, then each
  // trainer's.
  rows: MyEntryRow<T>[];
  total: number;
  page: number;
  pageSize: number;
  // Filter options over every entry, not just the filtered ones.
  competitions: MyEntriesCompetitionOption[];
  // 'YYYY' of every competition start, earliest first.
  years: string[];
  // 'MM' of every competition start in the chosen year (or any year).
  months: string[];
  // Only the blocks that have a row on this page.
  blocks: MyEntriesBlock[];
}

export interface MyEntriesFilter {
  q: string;
  competitionId: string;
  // 'YYYY' of the competition's start, or ALL_FILTER_VALUE.
  year: string;
  // 'MM' of the competition's start, or ALL_FILTER_VALUE.
  month: string;
  sort: MyEntriesSortOrder;
}
