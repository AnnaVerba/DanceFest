import { PERFORMANCE_ITEM } from './section-item-type';
import { onlyVenueItems } from './venue-items';
import { paginateByRows, resolvePage } from './pagination';
import type { RowPaged } from './pagination';
import type { SectionView } from './section-view';

export interface SnapshotFilter {
  dayId?: string;
  venueId?: string;
}

// The in-memory twin of ScheduleService.listSectionsPage, for a published
// snapshot: same day/venue scope, same section-aligned pages.
export function pageSnapshot(
  snapshot: SectionView[],
  filter: SnapshotFilter,
  rawPage: string | undefined,
  rawPageSize: string | undefined,
  defaultPageRows: number,
  maxPageRows: number,
): RowPaged<SectionView> {
  const { page, pageSize: targetRows } = resolvePage(
    rawPage,
    rawPageSize,
    defaultPageRows,
    maxPageRows,
  );

  let scoped = filter.dayId
    ? snapshot.filter((section) => section.dayId === filter.dayId)
    : snapshot;
  if (filter.venueId) {
    const venueEntryIds = new Set<string>();
    for (const section of scoped) {
      for (const item of section.items) {
        if (
          item.type === PERFORMANCE_ITEM &&
          item.exit?.venueId === filter.venueId
        ) {
          venueEntryIds.add(item.exit.entryId);
        }
      }
    }
    scoped = onlyVenueItems(
      scoped.filter((section) =>
        section.items.some(
          (item) => item.exit !== null && venueEntryIds.has(item.exit.entryId),
        ),
      ),
      venueEntryIds,
    );
  }

  if (scoped.length === 0) {
    return {
      rows: [],
      totalSections: 0,
      pageCount: 0,
      page: 0,
      rangeStart: 0,
      rangeEnd: 0,
    };
  }

  const rowsBySection = new Map(
    scoped.map((section) => [section.id, section.items.length]),
  );
  const pages = paginateByRows(
    scoped.map((section) => section.id),
    rowsBySection,
    targetRows,
  );
  const current = Math.min(Math.max(page, 0), pages.length - 1);
  const pageIds = new Set(pages[current]);
  const sectionsBefore = pages
    .slice(0, current)
    .reduce((sum, ids) => sum + ids.length, 0);

  return {
    rows: scoped.filter((section) => pageIds.has(section.id)),
    totalSections: scoped.length,
    pageCount: pages.length,
    page: current,
    rangeStart: sectionsBefore + 1,
    rangeEnd: sectionsBefore + pageIds.size,
  };
}
