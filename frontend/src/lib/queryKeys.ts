import type { CompetitionsQuery } from './competitions';
import type { CategoryType } from './categories';
import type { PublicProgramQuery } from './program';
import type { PageRequest, UnassignedFilter } from './schedule';
import type { NominationPageQuery, VenueSummaryGroupBy } from './nominations.types';
import type { FinanceGroup, FinanceGroupQuery } from './finance.types';

// Single source of truth for React Query cache keys. Filters and search
// terms are always part of the key — otherwise results from different
// inputs would overwrite each other in the cache.
export const queryKeys = {
  competitions: (query: CompetitionsQuery = {}) => ['competitions', query] as const,
  myCompetitions: (query: CompetitionsQuery = {}) =>
    ['competitions', 'mine', query] as const,
  competitionYears: () => ['competitions', 'years'] as const,
  competition: (id: string) => ['competition', id] as const,

  venues: (competitionId: string) => ['venues', competitionId] as const,
  entriesCount: (competitionId: string) => ['entries-count', competitionId] as const,
  entryStats: (competitionId: string) => ['entry-stats', competitionId] as const,
  publicEntries: (
    competitionId: string,
    query: { page?: number; pageSize?: number } = {},
  ) => ['applications', competitionId, 'public', query] as const,
  entries: (competitionId: string) => ['applications', competitionId, 'cabinet'] as const,
  myEntries: () => ['applications', 'mine'] as const,
  overages: (competitionId: string) => ['overages', competitionId] as const,
  financeSummary: (competitionId: string) =>
    ['finance', competitionId, 'summary'] as const,
  financeGroup: (competitionId: string, group: FinanceGroup, query: FinanceGroupQuery) =>
    ['finance', competitionId, group, query] as const,

  categories: (type?: CategoryType) => ['categories', type ?? 'all'] as const,
  categoryTemplates: (
    query: { page?: number; pageSize?: number; search?: string } = {},
  ) => ['category-templates', query] as const,
  categoryTemplate: (id: string) => ['category-template', id] as const,
  categoryTemplateMeta: (id: string) => ['category-template', id, 'meta'] as const,
  categoryTemplateNominations: (
    id: string,
    query: { page?: number; pageSize?: number } = {},
  ) => ['category-template', id, 'nominations', query] as const,

  participants: (query?: string) => ['participants', query ?? ''] as const,

  judges: (competitionId: string) => ['judges', competitionId] as const,
  nominations: (competitionId: string, q?: string) =>
    ['nominations', competitionId, q ?? ''] as const,
  // Prefix of every nominations query of a competition — invalidate this
  // after any change to its nominations.
  nominationsScope: (competitionId: string) => ['nominations', competitionId] as const,
  nominationsPage: (competitionId: string, query: NominationPageQuery) =>
    ['nominations', competitionId, 'page', query] as const,
  venueSummary: (competitionId: string, groupBy: VenueSummaryGroupBy) =>
    ['nominations', competitionId, 'venue-summary', groupBy] as const,

  me: () => ['me'] as const,

  publicProgram: (competitionId: string, query: PublicProgramQuery = {}) =>
    ['timing', competitionId, 'public', query] as const,
  myProgram: (competitionId: string) => ['timing', competitionId, 'mine'] as const,
  // Prefix of every program projection (public poster, «моя програма»).
  timingScope: (competitionId: string) => ['timing', competitionId] as const,

  rules: (competitionId: string) => ['rules', competitionId] as const,
  days: (competitionId: string) => ['days', competitionId] as const,
  sectionsScope: (competitionId: string) => ['sections', competitionId] as const,
  sections: (
    competitionId: string,
    filter: { dayId?: string; venueId?: string } & PageRequest = {},
  ) => ['sections', competitionId, filter] as const,
  sectionsSummary: (
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ) => ['sections', competitionId, 'summary', filter] as const,
  // Under the sections prefix: every schedule edit can create or clear one.
  venueConflicts: (competitionId: string) =>
    ['sections', competitionId, 'conflicts'] as const,
  sectionsStats: (
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ) => ['sections', competitionId, 'stats', filter] as const,
  unassigned: (
    competitionId: string,
    filter: UnassignedFilter & PageRequest = {},
  ) => ['unassigned', competitionId, filter] as const,
  // Prefix of every unassigned-pool query of a competition.
  unassignedScope: (competitionId: string) => ['unassigned', competitionId] as const,
  unassignedFacets: (competitionId: string) =>
    ['unassigned', competitionId, 'facets'] as const,

  zipJob: (jobId: string) => ['zip-job', jobId] as const,
};
