import type { Entry } from './entry.model';
import {
  MIN_PARTICIPANTS_PER_ENTRY,
  MONEY_ROUNDING_FACTOR,
} from './entries.constants';

export function roundMoney(amount: number): number {
  return (
    Math.round((amount + Number.EPSILON) * MONEY_ROUNDING_FACTOR) /
    MONEY_ROUNDING_FACTOR
  );
}

// The nomination price of one entry, or null when the nomination is
// unpriced or the entry is not linked to one.
function priceOf(
  entry: Entry,
  prices: Map<string, number | null>,
): number | null {
  return entry.nominationId ? (prices.get(entry.nominationId) ?? null) : null;
}

// How many people an entry puts on stage — at least one, even for an entry
// typed in by hand without dancers.
function dancerCount(entry: Entry): number {
  return Math.max(
    entry.participantsCount ?? entry.participantIds?.length ?? 0,
    MIN_PARTICIPANTS_PER_ENTRY,
  );
}

// What an entry costs (TASK-20): the nomination price is per person, so a
// trio at 500 costs 1500. A group's cheaper rate is just the lower price the
// organizer sets on the «Група» lineup (10 × 400 = 4000). Plus any extra-time
// fee recorded on the «Доплати» tab. A missing price contributes nothing
// rather than breaking the sum.
export function calculateEntryAmount(
  entry: Entry,
  prices: Map<string, number | null>,
): number {
  const price = priceOf(entry, prices) ?? 0;
  return roundMoney(price * dancerCount(entry) + Number(entry.extraFee));
}

// One dancer's part of an entry: their own nomination price plus an equal
// share of the performance's extra-time fee — what a participant sees in
// «Мої заявки». Times the dancer count it gives calculateEntryAmount back.
export function calculateParticipantShare(
  entry: Entry,
  prices: Map<string, number | null>,
): number {
  const price = priceOf(entry, prices) ?? 0;
  return roundMoney(price + Number(entry.extraFee) / dancerCount(entry));
}
