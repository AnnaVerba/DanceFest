import {
  ENTRY_AMOUNT_CURRENCY,
  ENTRY_AMOUNT_EMPTY_PLACEHOLDER,
  ENTRY_MIN_DANCERS,
} from './entryAmount.constants';

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

// Nomination prices are per person (TASK-20): a trio at 500 costs 1500.
// Mirrors the server's calculateEntryAmount, before any «Доплати» fee.
export function entryCostForDancers(
  price: number | null,
  dancers: number,
): number | null {
  return price === null ? null : price * Math.max(dancers, ENTRY_MIN_DANCERS);
}
