import type { Entry } from '../entries/entry.model';

// An entry together with what it costs (see calculateEntryAmount).
export interface PricedEntry {
  entry: Entry;
  amount: number;
}
