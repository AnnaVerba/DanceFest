import type { Entry } from '../entries/entry.model';

// An improvisation has no track. entries.improv is derived by the server
// from the exit's style (see planNominationExits).
export function isImprovisationEntry(entry: Pick<Entry, 'improv'>): boolean {
  return entry.improv;
}
