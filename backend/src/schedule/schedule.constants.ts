// Fallback when an exit has no nomination to resolve a limit from. Mirrors
// DEFAULT_DURATION_LIMIT_SECONDS in competition-rules, kept separate so the
// schedule module has no reason to import that service just for a number.
export const DEFAULT_LIMIT_SECONDS = 180;

export const SECTION_ITEMS_TABLE = 'section_items';

// Rewrites a section's running order in one statement: each id in the bound
// uuid[] gets its zero-based index as sortOrder.
export const PERSIST_ORDER_SQL = `
  UPDATE "${SECTION_ITEMS_TABLE}" AS item
     SET "sortOrder" = ordered.position - 1, "updatedAt" = NOW()
    FROM unnest($1::uuid[]) WITH ORDINALITY AS ordered(id, position)
   WHERE item.id = ordered.id`;

export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR;

// Upper bound on days auto-created for a competition. Guards against a
// competition mis-saved with a dateFrom..dateTo span of months.
export const MAX_COMPETITION_DAYS = 60;

// Pagination. The program and the editor page by *row* (performances,
// awards, breaks) but never split a section — a page holds whole sections
// until their combined row count reaches the target. The unassigned pool
// pages in plain *entry* units. Defaults are a comfortable screenful; the
// maxima only cap a hand-crafted request.
export const DEFAULT_SECTIONS_PAGE_ROWS = 60;
export const MAX_SECTIONS_PAGE_ROWS = 300;
export const DEFAULT_PROGRAM_PAGE_ROWS = 60;
export const MAX_PROGRAM_PAGE_ROWS = 300;
export const DEFAULT_UNASSIGNED_PAGE_SIZE = 100;
export const MAX_UNASSIGNED_PAGE_SIZE = 500;

export const DAY_NOT_FOUND_MESSAGE = 'День конкурсу не знайдено';
export const DAY_HAS_SECTIONS_MESSAGE =
  'У цьому дні вже є відділення — спершу приберіть їх';
export const SECTION_NOT_FOUND_MESSAGE = 'Відділення не знайдено';
export const SECTION_DAY_REQUIRED_MESSAGE = 'Вкажіть день відділення';
export const SECTION_START_INVALID_MESSAGE =
  'Час початку має бути у форматі ГГ:ХХ';
export const NO_ENTRIES_FOR_SECTION_MESSAGE =
  'Оберіть хоча б один вихід для відділення';
export const EXITS_ALREADY_ASSIGNED_MESSAGE =
  'Частина виходів уже розподілена по відділеннях';
export const ITEM_SET_MISMATCH_MESSAGE =
  'Список позицій не збігається зі складом відділення — розклад змінив хтось інший';
export const EXIT_NOT_IN_SCHEDULE_MESSAGE =
  'Цей вихід не розподілений у розклад';
export const NOMINATION_NOT_IN_SCHEDULE_MESSAGE =
  'Цієї номінації немає в розкладі';
export const MERGE_NEEDS_TWO_GROUPS_MESSAGE =
  'Для об’єднання потрібно щонайменше дві групи';
export const MERGE_LABEL_REQUIRED_MESSAGE = 'Вкажіть назву об’єднаної групи';
export const EXTENDED_PROGRAM_FORBIDDEN_MESSAGE =
  'Розширена програма доступна лише організаторам конкурсу';
export const ROW_NOT_FOUND_MESSAGE = 'Рядок не знайдено';
export const ROW_NOT_MANUAL_MESSAGE =
  'Змінювати можна лише перерву або гала-шоу';
export const SECTION_SET_MISMATCH_MESSAGE =
  'Список відділень не збігається зі складом дня — оновіть сторінку';
export const MIXED_VENUE_SECTION_MESSAGE =
  'Обрані виходи належать до різних майданчиків — сформуйте окремі відділення для кожного';
export const PROGRAM_NOT_PUBLISHED_MESSAGE = 'Програма ще не опублікована';
export const OTHER_VENUE_SECTION_MESSAGE =
  'Обрані виходи належать до іншого майданчика, ніж це відділення';
