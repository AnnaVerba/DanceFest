import type { Entry } from '../entries/entry.model';
import type { EntryCharge } from '../entries/pricing/entry-charge';

// An entry together with what it costs (see EntryChargeCalculator).
export interface PricedEntry {
  entry: Entry;
  amount: number;
  charge: EntryCharge;
}
