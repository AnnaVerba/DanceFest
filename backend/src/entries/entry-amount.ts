import type { ChargeableEntry } from './pricing/chargeable-entry.interface';
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

// How many people an entry puts on stage — at least one, even for an entry
// typed in by hand without dancers.
export function dancerCount(
  entry: Pick<ChargeableEntry, 'participantsCount' | 'participantIds'>,
): number {
  return Math.max(
    entry.participantsCount ?? entry.participantIds?.length ?? 0,
    MIN_PARTICIPANTS_PER_ENTRY,
  );
}
