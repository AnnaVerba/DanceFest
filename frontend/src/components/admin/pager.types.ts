// What a Pager reads and drives: a zero-based page over `total` rows.
export interface PageNavigator {
  page: number;
  pageSize: number;
  total: number;
  goTo(page: number): void;
}
