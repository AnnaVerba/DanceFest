// One line of the exported program sheet — a performance or a service row
// (break, gala, award), each carrying its day, venue and section so the
// sheet can be filtered and sorted.
export interface ProgramSheetRow {
  day: string;
  venue: string;
  section: string;
  time: string;
  nominationNumber: string;
  nomination: string;
  participantNumbers: string;
  performer: string;
  leaders: string;
  studio: string;
  duration: string;
}

// A sheet column: the row field it shows, its header and its width.
export interface ProgramSheetColumn {
  key: keyof ProgramSheetRow;
  header: string;
  width: number;
}
