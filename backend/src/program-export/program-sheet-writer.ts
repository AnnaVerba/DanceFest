import type { Border, Borders, Font, stream } from 'exceljs';
import {
  COLUMN_NOMINATION_NUMBER,
  COLUMN_PARTICIPANT_NUMBERS,
  COLUMN_PERFORMER,
  COLUMN_STUDIO_LEADER,
  EMPTY_CELL,
  PROGRAM_LINE_KIND,
  SHEET_BODY_FONT_SIZE,
  SHEET_BORDER_STYLE,
  SHEET_COLUMN_WIDTHS,
  SHEET_FIRST_COLUMN,
  SHEET_FIRST_LINE_ROW,
  SHEET_FIT_TO_HEIGHT,
  SHEET_FIT_TO_WIDTH,
  SHEET_FONT_NAME,
  SHEET_LAST_COLUMN,
  SHEET_NOMINATION_FIRST_COLUMN,
  SHEET_PAPER_SIZE_A4,
  SHEET_TIME_ROW,
  SHEET_TITLE_FONT_SIZE,
  SHEET_TITLE_ROW,
} from './program-excel.constants';
import type { ProgramSheet, ProgramSheetLine } from './program-sheet.interface';

type StreamingWorkbook = stream.xlsx.WorkbookWriter;
type StreamingSheet = ReturnType<StreamingWorkbook['addWorksheet']>;

const thin: Partial<Border> = { style: SHEET_BORDER_STYLE };
const ALL_BORDERS: Partial<Borders> = {
  top: thin,
  left: thin,
  bottom: thin,
  right: thin,
};
const titleFont: Partial<Font> = {
  name: SHEET_FONT_NAME,
  size: SHEET_TITLE_FONT_SIZE,
  bold: true,
};
const bodyFont: Partial<Font> = {
  name: SHEET_FONT_NAME,
  size: SHEET_BODY_FONT_SIZE,
};

// Writes program sheets into a streaming workbook, styled as the printed
// programme. Each sheet's rows are flushed to the output as soon as it is
// done, so only one section is ever held in memory.
export class ProgramSheetWriter {
  constructor(private readonly workbook: StreamingWorkbook) {}

  write(programSheet: ProgramSheet): void {
    const sheet = this.workbook.addWorksheet(programSheet.name, {
      pageSetup: {
        paperSize: SHEET_PAPER_SIZE_A4,
        orientation: 'portrait',
        fitToPage: true,
        fitToWidth: SHEET_FIT_TO_WIDTH,
        fitToHeight: SHEET_FIT_TO_HEIGHT,
      },
    });
    sheet.columns = SHEET_COLUMN_WIDTHS.map((width) => ({ width }));
    this.wideRow(sheet, SHEET_TITLE_ROW, programSheet.title, titleFont, false);
    this.wideRow(
      sheet,
      SHEET_TIME_ROW,
      programSheet.timeRange,
      titleFont,
      false,
    );
    programSheet.lines.forEach((line, index) =>
      this.line(sheet, SHEET_FIRST_LINE_ROW + index, line),
    );
    sheet.commit();
  }

  // A whole-width row (title, time range, break) merged across A–D.
  private wideRow(
    sheet: StreamingSheet,
    rowNumber: number,
    text: string,
    font: Partial<Font>,
    bordered: boolean,
  ): void {
    sheet.mergeCells(
      `${SHEET_FIRST_COLUMN}${rowNumber}:${SHEET_LAST_COLUMN}${rowNumber}`,
    );
    const cell = sheet.getCell(`${SHEET_FIRST_COLUMN}${rowNumber}`);
    cell.value = text;
    cell.font = font;
    cell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
      wrapText: true,
    };
    if (bordered) cell.border = ALL_BORDERS;
  }

  private line(
    sheet: StreamingSheet,
    rowNumber: number,
    line: ProgramSheetLine,
  ): void {
    if (line.kind === PROGRAM_LINE_KIND.SERVICE) {
      this.wideRow(
        sheet,
        rowNumber,
        line.label,
        { ...bodyFont, bold: true, italic: true },
        true,
      );
      return;
    }
    const row = sheet.getRow(rowNumber);
    if (line.kind === PROGRAM_LINE_KIND.NOMINATION) {
      const number = row.getCell(COLUMN_NOMINATION_NUMBER);
      number.value = line.number;
      number.font = { ...bodyFont, bold: true };
      number.border = ALL_BORDERS;
      sheet.mergeCells(
        `${SHEET_NOMINATION_FIRST_COLUMN}${rowNumber}:${SHEET_LAST_COLUMN}${rowNumber}`,
      );
      const name = row.getCell(COLUMN_PARTICIPANT_NUMBERS);
      name.value = line.name;
      name.font = { ...bodyFont, bold: true };
      name.alignment = {
        horizontal: 'center',
        vertical: 'middle',
        wrapText: true,
      };
      name.border = ALL_BORDERS;
      return;
    }
    const values: [number, string][] = [
      [COLUMN_NOMINATION_NUMBER, EMPTY_CELL],
      [COLUMN_PARTICIPANT_NUMBERS, line.participantNumbers],
      [COLUMN_PERFORMER, line.performer],
      [COLUMN_STUDIO_LEADER, line.studioLeader],
    ];
    for (const [column, value] of values) {
      const cell = row.getCell(column);
      cell.value = value;
      cell.font = bodyFont;
      cell.border = ALL_BORDERS;
    }
    row.getCell(COLUMN_PARTICIPANT_NUMBERS).alignment = {
      horizontal: 'right',
      vertical: 'middle',
    };
    for (const column of [COLUMN_PERFORMER, COLUMN_STUDIO_LEADER]) {
      row.getCell(column).alignment = {
        horizontal: 'left',
        vertical: 'middle',
        wrapText: true,
      };
    }
  }
}
