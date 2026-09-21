import type { Entry } from '../entries/entry.model';

// An entry together with what it costs (see calculateEntryAmount) and what
// each dancer in it pays (see calculateParticipantShare).
export interface PricedEntry {
  entry: Entry;
  amount: number;
  participantShare: number;
}
