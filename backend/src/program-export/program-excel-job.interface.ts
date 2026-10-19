import type { ProgramSheetPlaces } from './program-sheet.interface';

// Everything checked and looked up before the file starts streaming — so a
// refusal is still a proper HTTP error, not a broken download.
export interface ProgramExcelJob {
  fileName: string;
  sectionIds: string[];
  places: ProgramSheetPlaces;
}
