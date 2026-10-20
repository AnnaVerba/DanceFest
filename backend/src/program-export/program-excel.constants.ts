// The program as an .xlsx laid out like the printed programme: one sheet per
// venue and section, written while the sections are read a few at a time.

// How many sections are read from the database per step. A section holds
// a few hundred exits at most, so memory stays flat however big the
// competition gets.
export const PROGRAM_EXCEL_SECTIONS_PER_CHUNK = 5;

export const PROGRAM_FILE_NAME_PREFIX = 'Програма';
export const PROGRAM_FILE_NAME_SEPARATOR = ' — ';
export const PROGRAM_FILE_EXTENSION = '.xlsx';
export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
// RFC 5987: a UTF-8 file name ("Програма — …") in Content-Disposition.
export const CONTENT_DISPOSITION_PREFIX = "attachment; filename*=UTF-8''";

export const PROGRAM_LINE_KIND = {
  SERVICE: 'service',
  NOMINATION: 'nomination',
  PERFORMER: 'performer',
} as const;

// Rows the organizer inserts between performances, as the programme names
// them; a custom name follows after the separator.
export const SERVICE_ROW_LABELS: Record<string, string> = {
  award: 'Нагородження',
  break: 'Перерва',
  gala: 'Гала-шоу',
};
export const SERVICE_LABEL_SEPARATOR = ' · ';
export const PERFORMANCE_ITEM = 'performance';
export const AWARD_ITEM = 'award';

// "F3" — a nomination block's number, counted per section.
export const NOMINATION_NUMBER_MARK = 'F';
// "7, 12, 15" for a group; a dash for a dancer with no number yet.
export const PARTICIPANT_NUMBERS_SEPARATOR = ', ';
export const PARTICIPANT_NUMBER_PLACEHOLDER = '—';

// Sheet names: "Майданчик А · Відділення 1". Excel caps them at 31
// characters and forbids a few symbols.
export const SHEET_NAME_SEPARATOR = ' · ';
export const SHEET_NAME_MAX_LENGTH = 31;
export const SHEET_NAME_FORBIDDEN = /[\\/?*[\]:]/g;
export const SHEET_NAME_REPLACEMENT = '-';
export const SHEET_NAME_DUPLICATE_START = 2;
export const SHEET_NAME_DUPLICATE_OPEN = ' (';
export const SHEET_NAME_DUPLICATE_CLOSE = ')';
export const VENUE_UNASSIGNED_LABEL = 'Без майданчика';

// The section's "09:30 - 12:07"; times come as "HH:MM:SS", and a running
// time past midnight ("29:20:00") wraps to the clock.
export const SHEET_TIME_RANGE_SEPARATOR = ' - ';
export const CLOCK_SEPARATOR = ':';
export const CLOCK_PART_LENGTH = 2;
export const CLOCK_PAD = '0';
export const HOURS_PER_DAY = 24;
// Head and trainer share one cell, each with their role:
// "керівник Анна Бондар, тренер Марія Шевченко". The studio is left out of
// the programme (TASK-15).
export const LEADERS_SEPARATOR = ', ';
export const LEADER_ROLE_LABEL = 'керівник';
export const TRAINER_ROLE_LABEL = 'тренер';
export const EMPTY_CELL = '';

// Four columns: nomination №, participant №, performer, head / trainer.
// Widths are in Excel character units; positions are 1-based.
export const SHEET_COLUMN_WIDTHS = [7, 8, 42, 55];
export const COLUMN_NOMINATION_NUMBER = 1;
export const COLUMN_PARTICIPANT_NUMBERS = 2;
export const COLUMN_PERFORMER = 3;
export const COLUMN_LEADERS = 4;
export const SHEET_FIRST_COLUMN = 'A';
export const SHEET_LAST_COLUMN = 'D';
export const SHEET_NOMINATION_FIRST_COLUMN = 'B';
export const SHEET_TITLE_ROW = 1;
export const SHEET_TIME_ROW = 2;
// Row 3 stays empty; the table starts below it.
export const SHEET_FIRST_LINE_ROW = 4;

export const SHEET_FONT_NAME = 'Times New Roman';
export const SHEET_TITLE_FONT_SIZE = 16;
export const SHEET_BODY_FONT_SIZE = 12;
export const SHEET_BORDER_STYLE = 'thin';
// A4, portrait, as wide as one page and as long as it needs.
export const SHEET_PAPER_SIZE_A4 = 9;
export const SHEET_FIT_TO_WIDTH = 1;
export const SHEET_FIT_TO_HEIGHT = 0;

// The one sheet an unplanned program downloads as.
export const EMPTY_PROGRAM_SHEET_NAME = 'Програма';
