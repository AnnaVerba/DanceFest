import type { PublicProgramQuery, PublicProgramRow } from './program';
import type { RowPaged } from './pagination';

// Where the program's pages come from: the published snapshot, or the
// organizer's live preview of it.
export interface ProgramPageSource {
  fetchPage(query: PublicProgramQuery): Promise<RowPaged<PublicProgramRow>>;
}

// The day/venue scope a whole program is fetched under.
export interface WholeProgramFilter {
  dayId?: string;
  venueId?: string;
}
