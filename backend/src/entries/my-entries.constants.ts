// «Мої заявки»: one page of a person's entries, filtered and sorted here.
export const DEFAULT_MY_ENTRIES_PAGE_SIZE = 20;
export const MAX_MY_ENTRIES_PAGE_SIZE = 100;

// An empty competition / trainer filter means «all».
export const ALL_FILTER_VALUE = '';

// The order competitions come in, by start date. 'nearest': the coming
// ones soonest first, then the finished ones most recent first.
export const MY_ENTRIES_SORT_ORDERS = ['nearest', 'newest', 'oldest'] as const;
export const DEFAULT_MY_ENTRIES_SORT = 'nearest';

// Parts of an ISO date 'YYYY-MM-DD': its length, the year 'YYYY' and the
// month 'MM' as slice bounds.
export const ISO_DATE_LENGTH = 10;
export const ISO_YEAR_LENGTH = 4;
export const ISO_MONTH_START = 5;
export const ISO_MONTH_END = 7;
// Comparator directions for dates.
export const SORT_ASCENDING = 1;
export const SORT_DESCENDING = -1;
export const YEAR_PATTERN = /^\d{4}$/;
export const MONTH_PATTERN = /^(0[1-9]|1[0-2])$/;

// The key of a studio head's own block — never a user id.
export const OWN_ENTRIES_BLOCK_KEY = 'own';
export const TRAINER_NAME_COLLATOR_LOCALE = 'uk';

// Shorter search text is ignored — too broad to narrow anything.
export const MY_ENTRIES_SEARCH_MIN_CHARS = 3;

// Joins the searchable texts of an entry into one haystack.
export const ENTRY_SEARCH_TEXT_SEPARATOR = ' ';
