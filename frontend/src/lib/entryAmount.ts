import {
  ENTRY_AMOUNT_CURRENCY,
  ENTRY_AMOUNT_EMPTY_PLACEHOLDER,
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
