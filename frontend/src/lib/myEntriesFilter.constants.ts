import type { MyEntriesFilter } from './myEntriesFilter.types';

export const ALL_FILTER_VALUE = '';
// Shorter search text is not sent — the server would ignore it anyway.
export const MY_ENTRIES_SEARCH_MIN_CHARS = 3;
export const DEFAULT_MY_ENTRIES_FILTER: MyEntriesFilter = {
  year: ALL_FILTER_VALUE,
  month: ALL_FILTER_VALUE,
  query: '',
};
