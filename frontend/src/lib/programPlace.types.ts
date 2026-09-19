// Where a program runs: one day on one venue (null: no venue). Sections,
// public program rows and the editor's rows all carry both.
export interface ProgramPlace {
  dayId: string;
  venueId: string | null;
}
