import { apiRequest } from './http';
import { withPageParams } from './pagination';
import type { Paged, RowPaged } from './pagination';

export interface CompetitionDay {
  id: string;
  competitionId: string;
  date: string;
  label: string | null;
}

export type SectionItemType = 'performance' | 'award' | 'break' | 'gala';

export const MANUAL_ROW_TYPES: SectionItemType[] = ['break', 'gala'];

export const ROW_TYPE_LABELS: Record<'break' | 'gala', string> = {
  break: 'Перерва',
  gala: 'Гала-шоу',
};

export interface SectionExit {
  entryId: string;
  number: number;
  nomination: string;
  routineName: string;
  ageCategory: string | null;
  league: string | null;
  lineup: string | null;
  improv: boolean;
  studioName: string | null;
  choreographer: string | null;
  participantId: string | null;
  participantIds: string[];
  musicName: string | null;
}

export interface SectionItem {
  id: string;
  type: SectionItemType;
  nominationGroupKey: string | null;
  mergedGroupLabel: string | null;
  label: string | null;
  sortOrder: number;
  time: string;
  startTimeSeconds: number;
  durationSeconds: number | null;
  exit: SectionExit | null;
}

export interface AddRowInput {
  type: 'break' | 'gala';
  label: string;
  durationSeconds: number;
  afterItemId?: string;
}

export interface Section {
  id: string;
  competitionId: string;
  dayId: string;
  dayDate: string | null;
  venueId: string | null;
  name: string;
  startTime: string;
  pauseSeconds: number;
  sortOrder: number;
  items: SectionItem[];
}

export interface UnassignedExit {
  id: string;
  number: number;
  nomination: string;
  nominationId: string | null;
  routineName: string;
  ageCategory: string | null;
  league: string | null;
  lineup: string | null;
  improv: boolean;
  participantsCount: number | null;
  studioName: string | null;
}

export interface AssignedClash {
  entryId: string;
  number: number | null;
  sectionName: string | null;
}

export interface BuildSectionInput {
  dayId: string;
  venueId?: string;
  name: string;
  startTime: string;
  entryIds: string[];
}

export interface UnassignedFilter {
  league?: string;
  ageCategory?: string;
  nominationId?: string;
}

export interface SectionSummary {
  id: string;
  name: string;
  dayId: string;
  venueId: string | null;
  sortOrder: number;
}

export interface UnassignedFacets {
  leagues: string[];
  ageCategories: string[];
}

export interface SectionsStats {
  performances: number;
  noMusic: number;
  endTime: string | null;
}

export interface PageRequest {
  page?: number;
  pageSize?: number;
}

const base = (competitionId: string) => `/competitions/${competitionId}`;

export function getDays(competitionId: string): Promise<CompetitionDay[]> {
  return apiRequest<CompetitionDay[]>(`${base(competitionId)}/days`);
}

export function deleteDay(
  competitionId: string,
  dayId: string,
): Promise<void> {
  return apiRequest<void>(`${base(competitionId)}/days/${dayId}`, {
    method: 'DELETE',
  });
}

export function getSections(
  competitionId: string,
  filter: { dayId?: string; venueId?: string } & PageRequest = {},
): Promise<RowPaged<Section>> {
  const query = new URLSearchParams();
  if (filter.dayId) query.set('dayId', filter.dayId);
  if (filter.venueId) query.set('venueId', filter.venueId);
  withPageParams(query, filter.page, filter.pageSize);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<RowPaged<Section>>(
    `${base(competitionId)}/sections${suffix}`,
  );
}

export function getSectionsSummary(
  competitionId: string,
  filter: { dayId?: string; venueId?: string } = {},
): Promise<SectionSummary[]> {
  const query = new URLSearchParams();
  if (filter.dayId) query.set('dayId', filter.dayId);
  if (filter.venueId) query.set('venueId', filter.venueId);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<SectionSummary[]>(
    `${base(competitionId)}/sections/summary${suffix}`,
  );
}

export function getSectionsStats(
  competitionId: string,
  filter: { dayId?: string; venueId?: string } = {},
): Promise<SectionsStats> {
  const query = new URLSearchParams();
  if (filter.dayId) query.set('dayId', filter.dayId);
  if (filter.venueId) query.set('venueId', filter.venueId);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<SectionsStats>(
    `${base(competitionId)}/sections/stats${suffix}`,
  );
}

export function buildSection(
  competitionId: string,
  input: BuildSectionInput,
): Promise<Section> {
  return apiRequest<Section>(`${base(competitionId)}/sections`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function reorderSection(
  competitionId: string,
  sectionId: string,
  itemIds: string[],
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}/order`,
    { method: 'PATCH', body: JSON.stringify({ itemIds }) },
  );
}

export function updateSection(
  competitionId: string,
  sectionId: string,
  patch: { name?: string; startTime?: string },
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
}

export function deleteSection(
  competitionId: string,
  sectionId: string,
): Promise<void> {
  return apiRequest<void>(`${base(competitionId)}/sections/${sectionId}`, {
    method: 'DELETE',
  });
}

export function moveExit(
  competitionId: string,
  entryId: string,
  targetSectionId: string,
): Promise<{ sections: Section[] }> {
  return apiRequest<{ sections: Section[] }>(
    `${base(competitionId)}/schedule/move-exit`,
    { method: 'POST', body: JSON.stringify({ entryId, targetSectionId }) },
  );
}

export function mergeGroups(
  competitionId: string,
  sectionId: string,
  groupKeys: string[],
  label: string,
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}/merge-groups`,
    { method: 'POST', body: JSON.stringify({ groupKeys, label }) },
  );
}

export function unmergeGroup(
  competitionId: string,
  sectionId: string,
  groupKey: string,
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}/merge-groups/${encodeURIComponent(groupKey)}`,
    { method: 'DELETE' },
  );
}

export function addRow(
  competitionId: string,
  sectionId: string,
  input: AddRowInput,
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}/rows`,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateRow(
  competitionId: string,
  sectionId: string,
  itemId: string,
  patch: { label?: string; durationSeconds?: number },
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}/rows/${itemId}`,
    { method: 'PATCH', body: JSON.stringify(patch) },
  );
}

export function deleteRow(
  competitionId: string,
  sectionId: string,
  itemId: string,
): Promise<Section> {
  return apiRequest<Section>(
    `${base(competitionId)}/sections/${sectionId}/rows/${itemId}`,
    { method: 'DELETE' },
  );
}

export function reorderSections(
  competitionId: string,
  dayId: string,
  sectionIds: string[],
): Promise<{ sections: Section[] }> {
  return apiRequest<{ sections: Section[] }>(
    `${base(competitionId)}/schedule/reorder-sections`,
    { method: 'POST', body: JSON.stringify({ dayId, sectionIds }) },
  );
}

export function recalculateSchedule(
  competitionId: string,
  sectionId?: string,
): Promise<{ sections: Section[] }> {
  return apiRequest<{ sections: Section[] }>(
    `${base(competitionId)}/schedule/recalculate`,
    { method: 'POST', body: JSON.stringify(sectionId ? { sectionId } : {}) },
  );
}

function unassignedQuery(filter: UnassignedFilter): URLSearchParams {
  const query = new URLSearchParams();
  if (filter.league) query.set('league', filter.league);
  if (filter.ageCategory) query.set('ageCategory', filter.ageCategory);
  if (filter.nominationId) query.set('nominationId', filter.nominationId);
  return query;
}

export function getUnassigned(
  competitionId: string,
  filter: UnassignedFilter & PageRequest = {},
): Promise<Paged<UnassignedExit>> {
  const query = unassignedQuery(filter);
  withPageParams(query, filter.page, filter.pageSize);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<Paged<UnassignedExit>>(
    `${base(competitionId)}/performances/unassigned${suffix}`,
  );
}

export function getUnassignedFacets(
  competitionId: string,
): Promise<UnassignedFacets> {
  return apiRequest<UnassignedFacets>(
    `${base(competitionId)}/performances/unassigned/facets`,
  );
}

export function getUnassignedIds(
  competitionId: string,
  filter: UnassignedFilter = {},
): Promise<string[]> {
  const query = unassignedQuery(filter);
  const suffix = query.toString() ? `?${query}` : '';
  return apiRequest<string[]>(
    `${base(competitionId)}/performances/unassigned/ids${suffix}`,
  );
}
