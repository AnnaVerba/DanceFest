// What a SectionPager reads and drives: a zero-based page over
// section-aligned pages, with the 1-based section range it shows.
export interface SectionPageNavigator {
  page: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  totalSections: number;
  goTo(page: number): void;
}
