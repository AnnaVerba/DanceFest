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
  | { status: 'ready'; amounts: number[]; total: number }
  | { status: 'failed' };
