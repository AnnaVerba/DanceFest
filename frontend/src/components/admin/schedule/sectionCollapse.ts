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

export function toggleSection(
  state: SectionCollapse,
  sectionId: string,
): SectionCollapse {
  const toggled = new Set(state.toggled);
  if (toggled.has(sectionId)) toggled.delete(sectionId);
  else toggled.add(sectionId);
  return { ...state, toggled };
}
