// Shared pagination + typeahead helpers.

export interface PageParams {
  page: number;
  pageSize: number;
  limit: number;
  offset: number;
}

// The shape every offset-paginated list endpoint returns.
export interface PagedResult<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

// Parses the `page` / `pageSize` query pair. `page` is zero-based; anything
// missing or out of range is clamped.
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

// Typeahead: a picker sends a query only once the user has typed a few
// characters, and never wants more than a screenful back.
export const TYPEAHEAD_MIN_CHARS = 2;
export const TYPEAHEAD_LIMIT = 10;

// null when the query is too short to search on (the caller returns []).
export function resolveTypeahead(
  rawQuery: string | undefined,
  minChars = TYPEAHEAD_MIN_CHARS,
): string | null {
  const q = (rawQuery ?? '').trim();
  return q.length >= minChars ? q : null;
}
