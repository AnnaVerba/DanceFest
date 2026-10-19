import type { ProgramSheetColumn } from './programExcel.types';

export const PROGRAM_SHEET_NAME = 'Програма';
export const PROGRAM_FILE_NAME_PREFIX = 'Програма';
export const PROGRAM_FILE_NAME_SEPARATOR = ' — ';
export const PROGRAM_FILE_EXTENSION = '.xlsx';
export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Column widths are in Excel character units.
export const PROGRAM_SHEET_COLUMNS: ProgramSheetColumn[] = [
  { key: 'day', header: 'День', width: 14 },
  { key: 'venue', header: 'Майданчик', width: 16 },
  { key: 'section', header: 'Відділення', width: 22 },
  { key: 'time', header: 'Час', width: 8 },
  { key: 'nominationNumber', header: '№ номінації', width: 12 },
  { key: 'nomination', header: 'Номінація', width: 40 },
  { key: 'participantNumbers', header: '№ учасника', width: 14 },
  { key: 'performer', header: 'Учасник', width: 30 },
  { key: 'leaders', header: 'Керівник / тренер', width: 36 },
  { key: 'studio', header: 'Студія', width: 24 },
  { key: 'duration', header: 'Тривалість', width: 11 },
];

// The header row stays in view while the sheet scrolls.
export const PROGRAM_SHEET_FROZEN_ROWS = 1;
export const PROGRAM_SHEET_HEADER_ROW = 1;
export const PROGRAM_EXPORT_ERROR = 'Не вдалося вивантажити програму в Excel.';
export const PROGRAM_EXPORT_LABEL = 'Excel';
export const PROGRAM_EXPORT_BUSY_LABEL = 'Вивантаження…';
export const PROGRAM_EXPORT_TITLE = 'Завантажити програму у форматі Excel';
export const EMPTY_CELL = '';
