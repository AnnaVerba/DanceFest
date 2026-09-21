export interface EntriesQuoteInput {
  participantIds: string[];
  nominationIds: string[];
}

export interface EntriesQuote {
  amounts: number[];
  total: number;
}

export type EntriesQuoteState =
  | { status: 'idle' }
  // A quote for the current selection is in flight. `total` is the previous
  // selection's total, kept so the figure does not blink, or null when there
  // is none yet. `amounts` are deliberately absent: they are positional, so
  // the old ones would land on the wrong rows.
  | { status: 'loading'; total: number | null }
  | { status: 'ready'; amounts: number[]; total: number }
  | { status: 'failed' };
