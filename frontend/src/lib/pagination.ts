// Plain uniform pagination — the unassigned pool. `total` is the entry
// count under the current filter.
export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Row-bounded, section-aligned pagination — the editor and the public
// program. Pages hold whole sections up to a target row count, so their
// sizes vary and `pageCount` comes from the server. `rangeStart` /
// `rangeEnd` are the 1-based section positions on the current page.
export interface RowPaged<T> {
  rows: T[];
  totalSections: number;
  pageCount: number;
  page: number;
  rangeStart: number;
  rangeEnd: number;
}

// Appends page / pageSize to a URLSearchParams only when set.
export function withPageParams(
  query: URLSearchParams,
  page?: number,
  pageSize?: number,
): URLSearchParams {
  if (page != null) query.set('page', String(page));
  if (pageSize != null) query.set('pageSize', String(pageSize));
  return query;
}
