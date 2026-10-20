import type { MyEntry } from './entries';
import type { PricedEntry } from './entryAmount.types';
import type { MyEntriesFilter } from './myEntriesFilter.types';

// An entry on a page of «Мої заявки», with the block it is shown in: a
// studio head's own ('own') or a trainer's id.
export interface MyEntryRow extends MyEntry {
  blockKey: string;
}

// One block of a competition's entries, totalled over the whole filtered
// list — it may run over a page break.
export interface MyEntriesBlockSummary {
  competitionId: string;
  blockKey: string;
  trainerName: string | null;
  entries: (PricedEntry & { musicFee: number; baseAmount: number })[];
}

export interface MyEntriesPage {
  // In display order: competition, then a head's own block, then each
  // trainer's.
  rows: MyEntryRow[];
  total: number;
  page: number;
  pageSize: number;
  competitions: { id: string; name: string | null }[];
  // 'YYYY' of every competition start, earliest first.
  years: string[];
  // 'MM' of every competition start in the chosen year (or any year).
  months: string[];
  // Only the blocks with a row on this page.
  blocks: MyEntriesBlockSummary[];
}

export interface MyEntriesPageQuery {
  filter: MyEntriesFilter;
  page: number;
  pageSize: number;
}

// Rows of one block as the page draws them.
export interface MyEntriesBlockView {
  key: string;
  trainerName: string | null;
  rows: MyEntryRow[];
  summary: MyEntriesBlockSummary | undefined;
}

// Rows of one competition as the page draws them.
export interface MyEntriesGroupView {
  competitionId: string;
  competitionName: string | null;
  competitionDateFrom: string | null;
  competitionDateTo: string | null;
  blocks: MyEntriesBlockView[];
}
