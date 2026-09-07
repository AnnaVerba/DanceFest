// Parses the `page` / `pageSize` query pair into a Sequelize-ready
// { limit, offset } plus the normalised values to echo back to the client.
// `page` is zero-based; anything missing or out of range is clamped.

export interface PageParams {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

// What the plain (uniform) paginated endpoints return — the unassigned
// pool. `total` is the entry count under the current filter.
export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// What the row-bounded, section-aligned endpoints return — the editor and
// the public program. Pages hold whole sections, so their sizes vary and
// `pageCount` cannot be derived from a single page size. `rangeStart` /
// `rangeEnd` are the 1-based section positions on this page.
export interface RowPaged<T> {
  rows: T[];
  totalSections: number;
  pageCount: number;
  page: number;
  rangeStart: number;
  rangeEnd: number;
}

// Greedily groups section ids into pages: a page keeps taking whole
// sections until adding the next one would push its row count past
// `targetRows`. A single oversized section still forms its own page.
export function paginateByRows(
  sectionIds: string[],
  rowCountBySection: Map<string, number>,
  targetRows: number,
): string[][] {
  const pages: string[][] = [];
  let current: string[] = [];
  let acc = 0;
  for (const id of sectionIds) {
    const n = rowCountBySection.get(id) ?? 0;
    if (current.length > 0 && acc + n > targetRows) {
      pages.push(current);
      current = [];
      acc = 0;
    }
    current.push(id);
    acc += n;
  }
  if (current.length > 0) pages.push(current);
  return pages;
}

export function resolvePage(
  rawPage: string | undefined,
  rawPageSize: string | undefined,
  defaultPageSize: number,
  maxPageSize: number,
): PageParams {
  const parsedSize = Number.parseInt(rawPageSize ?? '', 10);
  const pageSize =
    Number.isFinite(parsedSize) && parsedSize > 0
      ? Math.min(parsedSize, maxPageSize)
      : defaultPageSize;

  const parsedPage = Number.parseInt(rawPage ?? '', 10);
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 0;

  return { page, pageSize, limit: pageSize, offset: page * pageSize };
}
