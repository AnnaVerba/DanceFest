// Raw query-string parameters of the paged admin list.
export interface NominationPageQuery {
  page?: string;
  pageSize?: string;
  // Comma-separated category ids; a nomination must carry all of them.
  categoryIds?: string;
  q?: string;
  // A venue id, or UNASSIGNED_VENUE_QUERY_VALUE for nominations without one.
  venue?: string;
}

export interface VenueSummaryRow {
  categoryId: string;
  name: string;
  total: number;
  unassigned: number;
}
