import type {
  ExtendedProgramItem,
  ExtendedProgramSection,
} from '../../../lib/program';
import type { CompetitionDay } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { formatClock, formatDuration } from '../../../lib/duration';
import { formatParticipantNumbers } from '../../../lib/participantNumbers';
import { formatMarkedNominationNumber } from '../../../lib/programNumbers';
import { formatLeaders } from '../../../lib/programRowFormat';
import { VENUE_UNASSIGNED_LABEL } from '../../../lib/nominationVenue.constants';
import { downloadBlob } from '../../../lib/downloadFile';
import {
  LABEL_SEPARATOR,
  SERVICE_ROW_LABELS,
} from '../../program/FestivalProgram.constants';
import type { ProgramSheetRow } from './programExcel.types';
import {
  EMPTY_CELL,
  PROGRAM_FILE_EXTENSION,
  PROGRAM_FILE_NAME_PREFIX,
  PROGRAM_FILE_NAME_SEPARATOR,
  PROGRAM_SHEET_COLUMNS,
  PROGRAM_SHEET_FROZEN_ROWS,
  PROGRAM_SHEET_HEADER_ROW,
  PROGRAM_SHEET_NAME,
  XLSX_MIME_TYPE,
} from './programExcel.constants';

function serviceLabel(item: ExtendedProgramItem): string {
  const kind = item.type as keyof typeof SERVICE_ROW_LABELS;
  return item.groupLabel
    ? `${SERVICE_ROW_LABELS[kind]}${LABEL_SEPARATOR}${item.groupLabel}`
    : SERVICE_ROW_LABELS[kind];
}

// Every position of the live program in running order, one sheet row each.
// Nominations are numbered per section as both programmes number them: a
// new number whenever the group changes or a break / gala interrupts it.
export function buildProgramSheetRows(
  sections: ExtendedProgramSection[],
  days: CompetitionDay[],
  venues: Venue[],
): ProgramSheetRow[] {
  const dayLabels = new Map(days.map((day) => [day.id, day.label ?? day.date]));
  const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]));
  const venueOf = (venueId: string | null) =>
    venues.length === 0
      ? EMPTY_CELL
      : ((venueId && venueNames.get(venueId)) || VENUE_UNASSIGNED_LABEL);

  const rows: ProgramSheetRow[] = [];
  for (const section of sections) {
    const place = {
      day: dayLabels.get(section.dayId) ?? EMPTY_CELL,
      venue: venueOf(section.venueId),
      section: section.name,
    };
    let runLabel: string | null = null;
    let categoryNumber = 0;
    for (const item of section.items) {
      const base: ProgramSheetRow = {
        ...place,
        time: formatClock(item.time),
        nominationNumber: EMPTY_CELL,
        nomination: EMPTY_CELL,
        participantNumbers: EMPTY_CELL,
        performer: EMPTY_CELL,
        leaders: EMPTY_CELL,
        studio: EMPTY_CELL,
        duration: formatDuration(item.effectiveDurationSeconds),
      };
      if (item.type !== 'performance') {
        if (item.type !== 'award') runLabel = null;
        rows.push({ ...base, nomination: serviceLabel(item) });
        continue;
      }
      if (item.groupLabel !== runLabel) {
        runLabel = item.groupLabel;
        categoryNumber += 1;
      }
      rows.push({
        ...base,
        nominationNumber: formatMarkedNominationNumber(categoryNumber),
        nomination: item.groupLabel ?? EMPTY_CELL,
        participantNumbers: formatParticipantNumbers(item.participantNumbers),
        performer: item.routineName ?? EMPTY_CELL,
        leaders: formatLeaders(item),
        studio: item.studioName ?? EMPTY_CELL,
      });
    }
  }
  return rows;
}

// Builds the .xlsx and hands it to the browser. exceljs is loaded only
// here, so the editor does not ship it to everyone.
export async function downloadProgramExcel(
  rows: ProgramSheetRow[],
  competitionName: string,
): Promise<void> {
  const excel = await import('exceljs');
  const { Workbook } = excel.default ?? excel;
  const workbook = new Workbook();
  const sheet = workbook.addWorksheet(PROGRAM_SHEET_NAME, {
    views: [{ state: 'frozen', ySplit: PROGRAM_SHEET_FROZEN_ROWS }],
  });
  sheet.columns = PROGRAM_SHEET_COLUMNS.map((column) => ({
    key: column.key,
    header: column.header,
    width: column.width,
  }));
  sheet.getRow(PROGRAM_SHEET_HEADER_ROW).font = { bold: true };
  sheet.addRows(rows);

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBlob(
    new Blob([buffer], { type: XLSX_MIME_TYPE }),
    `${PROGRAM_FILE_NAME_PREFIX}${PROGRAM_FILE_NAME_SEPARATOR}${competitionName}${PROGRAM_FILE_EXTENSION}`,
  );
}
