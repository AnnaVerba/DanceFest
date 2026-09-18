import type { PublicProgramRow } from './program';

// One programme section: its header row plus every row up to the next one.
export interface ProgramSection {
  id: string;
  head: PublicProgramRow;
  rows: PublicProgramRow[];
}

// The sections that share a venue — one tab of the public programme.
export interface VenueProgram {
  venueId: string | null;
  name: string;
  sections: ProgramSection[];
}
