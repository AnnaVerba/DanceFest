import {
  ENTRY_AMOUNT_CURRENCY,
  ENTRY_AMOUNT_EMPTY_PLACEHOLDER,
} from './entryAmount.constants';
import type { ParticipantAmount, PricedEntry } from './entryAmount.types';
import { formatParticipants } from './entryParticipants';

// "700 грн" for a set price, a dash when there is none (an unpriced
// nomination, or an entry not yet linked to one).
export function formatEntryAmount(amount: number | null): string {
  return amount
    ? `${amount} ${ENTRY_AMOUNT_CURRENCY}`
    : ENTRY_AMOUNT_EMPTY_PLACEHOLDER;
}

// A missing price (null) contributes nothing to the total rather than
// breaking it.
export function sumEntryAmounts(amounts: (number | null)[]): number {
  return amounts.reduce((sum: number, amount) => sum + (amount ?? 0), 0);
}

// One total per performer (a group counts as one performer), so a group
// entry's price is never counted once per dancer.
export function sumAmountsByParticipant(
  entries: PricedEntry[],
): ParticipantAmount[] {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    const participant = formatParticipants(entry.participants);
    totals.set(participant, (totals.get(participant) ?? 0) + (entry.price ?? 0));
  }
  return [...totals].map(([participant, amount]) => ({ participant, amount }));
}
