export const SECTION_ITEM_TYPES = [
  'performance',
  'award',
  'break',
  'gala',
] as const;
export type SectionItemType = (typeof SECTION_ITEM_TYPES)[number];

export const PERFORMANCE_ITEM: SectionItemType = 'performance';
export const AWARD_ITEM: SectionItemType = 'award';
export const BREAK_ITEM: SectionItemType = 'break';
export const GALA_ITEM: SectionItemType = 'gala';

// Rows the organizer inserts by hand — they carry a label and a manual
// duration, and no pause follows them.
export const MANUAL_ROW_TYPES: SectionItemType[] = [BREAK_ITEM, GALA_ITEM];

export function isManualRow(type: SectionItemType): boolean {
  return MANUAL_ROW_TYPES.includes(type);
}
