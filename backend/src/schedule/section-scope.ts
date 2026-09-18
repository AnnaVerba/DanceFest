// Which sections a day/venue filter reaches, and — under a venue filter —
// which scheduled exits belong to that venue (null: no venue filter).
export interface SectionScope {
  where: Record<string, unknown>;
  venueEntryIds: Set<string> | null;
}
