import type { SectionCollapse } from './sectionCollapse.types';

export function sectionsCollapsed(collapsed: boolean): SectionCollapse {
  return { collapsedByDefault: collapsed, toggled: new Set() };
}

export function isSectionCollapsed(
  state: SectionCollapse,
  sectionId: string,
): boolean {
  return state.collapsedByDefault !== state.toggled.has(sectionId);
}

// The same state with this section open, whatever it was before.
export function expandSection(
  state: SectionCollapse,
  sectionId: string,
): SectionCollapse {
  return isSectionCollapsed(state, sectionId)
    ? toggleSection(state, sectionId)
    : state;
}

export function toggleSection(
  state: SectionCollapse,
  sectionId: string,
): SectionCollapse {
  const toggled = new Set(state.toggled);
  if (toggled.has(sectionId)) toggled.delete(sectionId);
  else toggled.add(sectionId);
  return { ...state, toggled };
}
