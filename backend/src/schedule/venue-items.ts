import { PERFORMANCE_ITEM } from './section-item-type';
import type { SectionView } from './section-view';

// Hides other venues' performances. Every remaining row keeps the time it
// has in the full running order — a filter never moves a clock.
export function onlyVenueItems(
  views: SectionView[],
  venueEntryIds: Set<string> | null,
): SectionView[] {
  if (!venueEntryIds) return views;
  return views.map((view) => ({
    ...view,
    items: view.items.filter(
      (item) =>
        item.type !== PERFORMANCE_ITEM ||
        (item.exit !== null && venueEntryIds.has(item.exit.entryId)),
    ),
  }));
}
