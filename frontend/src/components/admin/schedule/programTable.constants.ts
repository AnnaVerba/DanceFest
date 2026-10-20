// Columns of the program table: the public one, and the technical one with
// the headcount, the duration and the row actions on top.
export const PUBLIC_COLUMN_COUNT = 6;
export const TECH_COLUMN_COUNT = 9;
// Columns the group heading and a break row span, after the number cell: all
// but the time — and, in the technical table, the headcount besides.
export const PUBLIC_LABEL_SPAN = 4;
export const TECH_LABEL_SPAN = 5;

// The technical table's headcount column.
export const PARTICIPANTS_COUNT_LABEL = 'Кількість учасників';

// Between venue names when one (merged) group spans several venues.
export const VENUE_LIST_SEPARATOR = ', ';

// Merged groups render as one block, keyed by their shared label.
export const MERGED_BLOCK_KEY_PREFIX = 'merged:';

// Joins a nomination group key with its exit's label: a per-program
// nomination renders one block per program, as the public program does.
export const EXIT_BLOCK_KEY_SEPARATOR = '|';

// A section holding exits of another venue — possible once a nomination is
// moved to another venue after the program was formed.
export const FOREIGN_VENUE_WARNING_PREFIX =
  'У відділенні є виступи іншого майданчика:';
export const FOREIGN_VENUE_WARNING_HINT =
  ' — перенесіть їх у відділення свого майданчика.';

// A break's (or gala's) name, editable in place while editing the program.
export const MANUAL_ROW_LABEL_DRAFT_PREFIX = 'l-';
export const MANUAL_ROW_LABEL_PLACEHOLDER = 'Назва';
export const MANUAL_ROW_LABEL_SEPARATOR = ' · ';
