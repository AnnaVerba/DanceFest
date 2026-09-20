// A nomination block renamed in the program: a merged block renames its
// display label, a single nomination renames the nomination itself.
export interface BlockRename {
  sectionId: string;
  groupKey: string;
  merged: boolean;
  nominationId: string | null;
  label: string;
}
