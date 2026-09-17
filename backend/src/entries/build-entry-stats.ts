import { MIN_PARTICIPANTS_PER_ENTRY } from './entries.constants';
import type { Entry } from './entry.model';
import type { EntryStats } from './entry-stats.interface';

function addDistinct(values: Set<string>, raw: string | null): void {
  const value = raw?.trim().toLowerCase();
  if (value) values.add(value);
}

// Aggregate-only numbers for the public page — no names are exposed.
// Studios and cities are compared case-insensitively.
export function buildEntryStats(entries: Entry[]): EntryStats {
  const dancers = new Set<string>();
  let dancersWithoutAccount = 0;
  const studios = new Set<string>();
  const cities = new Set<string>();
  const nominations = new Set<string>();
  const lineups = new Map<string, number>();

  for (const entry of entries) {
    const participantIds = entry.participantIds ?? [];
    if (participantIds.length > 0) {
      for (const id of participantIds) dancers.add(id);
    } else {
      dancersWithoutAccount +=
        entry.participantsCount ?? MIN_PARTICIPANTS_PER_ENTRY;
    }
    addDistinct(studios, entry.studioName);
    addDistinct(cities, entry.city);
    nominations.add(entry.nominationId ?? entry.nomination);
    if (entry.lineup) {
      lineups.set(entry.lineup, (lineups.get(entry.lineup) ?? 0) + 1);
    }
  }

  return {
    performances: entries.length,
    participants: dancers.size + dancersWithoutAccount,
    studios: studios.size,
    cities: cities.size,
    nominations: nominations.size,
    lineups: [...lineups].map(([label, count]) => ({ label, count })),
  };
}
