import {
  ENTRY_AMOUNT_CURRENCY,
  ENTRY_AMOUNT_EMPTY_PLACEHOLDER,
  KOPIYKAS_PER_HRYVNIA,
} from './entryAmount.constants';
import type { ParticipantAmount, PricedEntry } from './entryAmount.types';
import {
  formatParticipantName,
  formatParticipants,
} from './entryParticipants';

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

// One total per dancer: every number they danced adds their own part of it,
// so a group number is charged to each of its dancers instead of standing as
// a performer of its own. An entry that names no dancers keeps the whole
// amount under its performer label.
export function sumAmountsByParticipant(
  entries: PricedEntry[],
): ParticipantAmount[] {
  const kopiykasByKey = new Map<string, ParticipantAmount>();
  for (const entry of entries) {
    if (entry.participantAmounts.length === 0) {
      const label = formatParticipants(entry.participants);
      addTo(kopiykasByKey, label, label, entry.amount);
      continue;
    }
    const byId = new Map(entry.participants.map((p) => [p.id, p]));
    for (const share of entry.participantAmounts) {
      const participant = byId.get(share.participantId);
      if (participant === undefined) continue;
      addTo(
        kopiykasByKey,
        share.participantId,
        formatParticipantName(participant),
        share.amount,
      );
    }
  }
  return [...kopiykasByKey.values()].map((row) => ({
    ...row,
    amount: row.amount / KOPIYKAS_PER_HRYVNIA,
  }));
}

// Rows carry kopiykas while they accumulate — `toKopiykas` is a unit change,
// not a rounding: every amount it reads is already kopiyka-granular.
function addTo(
  rows: Map<string, ParticipantAmount>,
  key: string,
  participant: string,
  amount: number,
): void {
  const row = rows.get(key) ?? { key, participant, amount: 0 };
  row.amount += toKopiykas(amount);
  rows.set(key, row);
}

function toKopiykas(hryvnia: number): number {
  return Math.round(hryvnia * KOPIYKAS_PER_HRYVNIA);
}
