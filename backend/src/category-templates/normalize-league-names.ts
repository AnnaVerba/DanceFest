// League names are matched against entry.league as typed on the entry, so
// only surrounding whitespace and duplicates are dropped.
export function normalizeLeagueNames(names: string[] | undefined): string[] {
  return [...new Set((names ?? []).map((name) => name.trim()).filter(Boolean))];
}
