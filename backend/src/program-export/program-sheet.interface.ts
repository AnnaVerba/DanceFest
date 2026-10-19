import type { PROGRAM_LINE_KIND } from './program-excel.constants';

// A break, gala or award — one row across the whole table.
export interface ProgramServiceLine {
  kind: typeof PROGRAM_LINE_KIND.SERVICE;
  label: string;
}

// A nomination block's heading: "F3" and the nomination name.
export interface ProgramNominationLine {
  kind: typeof PROGRAM_LINE_KIND.NOMINATION;
  number: string;
  name: string;
}

// One performance: participant numbers, performer and their head / trainer.
// The studio is left out of the programme (TASK-15).
export interface ProgramPerformerLine {
  kind: typeof PROGRAM_LINE_KIND.PERFORMER;
  participantNumbers: string;
  performer: string;
  leaders: string;
}

export type ProgramSheetLine =
  | ProgramServiceLine
  | ProgramNominationLine
  | ProgramPerformerLine;

// One section of the program — one worksheet: title, time range, then its
// lines in running order.
export interface ProgramSheet {
  name: string;
  title: string;
  timeRange: string;
  lines: ProgramSheetLine[];
}

// What a sheet name is built from besides the section: its day and venue.
export interface ProgramSheetPlaces {
  // Set only when the competition runs over several days.
  dayLabels: Map<string, string> | null;
  // Set only when the competition has venues.
  venueNames: Map<string, string> | null;
}
