import type { PublicProgramRow } from '../../lib/program';
import type { ProgramSection } from '../../lib/programSections.types';

// The server's answer to one search, kept with the query it answers so a
// stale answer is never shown for a newer query.
export interface ProgramSearchHit {
  query: string;
  sectionIds: Set<string>;
}

export interface LazyProgram {
  // Every section header; null until the outline has loaded.
  outline: PublicProgramRow[] | null;
  loadError: string | null;
  // Every section, with its rows once they have been fetched.
  sections: ProgramSection[];
  // Ids (ProgramSection.id) of the sections the current query matched;
  // null while there is no query or its answer is still on the way.
  matchedIds: Set<string> | null;
  isLoaded: (section: ProgramSection) => boolean;
  loadSections: (sections: ProgramSection[]) => void;
}
