import type { CompetitionsQuery } from './competitions';
import type { CategoryType } from './categories';
import type { PublicProgramQuery } from './program';
import type { PageRequest, UnassignedFilter } from './schedule';

// Single source of truth for React Query cache keys. Filters and search
// terms are always part of the key — otherwise results from different
// inputs would overwrite each other in the cache.
export const queryKeys = {
  competitions: (query: CompetitionsQuery = {}) => ['competitions', query] as const,
  competitionYears: () => ['competitions', 'years'] as const,
  competition: (id: string) => ['competition', id] as const,

  venues: (competitionId: string) => ['venues', competitionId] as const,
  entriesCount: (competitionId: string) => ['entries-count', competitionId] as const,
  publicEntries: (
    competitionId: string,
    query: { page?: number; pageSize?: number } = {},
  ) => ['applications', competitionId, 'public', query] as const,
  entries: (competitionId: string) => ['applications', competitionId, 'cabinet'] as const,
  myEntries: () => ['applications', 'mine'] as const,
  overages: (competitionId: string) => ['overages', competitionId] as const,

  categories: (type?: CategoryType) => ['categories', type ?? 'all'] as const,
  categoryTemplates: (
    query: { page?: number; pageSize?: number; search?: string } = {},
  ) => ['category-templates', query] as const,
  categoryTemplate: (id: string) => ['category-template', id] as const,

  participants: (query?: string) => ['participants', query ?? ''] as const,

  judges: (competitionId: string) => ['judges', competitionId] as const,
  nominations: (competitionId: string, q?: string) =>
    ['nominations', competitionId, q ?? ''] as const,

  me: () => ['me'] as const,

  publicProgram: (competitionId: string, query: PublicProgramQuery = {}) =>
    ['timing', competitionId, 'public', query] as const,
  myProgram: (competitionId: string) => ['timing', competitionId, 'mine'] as const,

  rules: (competitionId: string) => ['rules', competitionId] as const,
  days: (competitionId: string) => ['days', competitionId] as const,
  sections: (
    competitionId: string,
    filter: { dayId?: string; venueId?: string } & PageRequest = {},
  ) => ['sections', competitionId, filter] as const,
  sectionsSummary: (
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ) => ['sections', competitionId, 'summary', filter] as const,
  sectionsStats: (
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ) => ['sections', competitionId, 'stats', filter] as const,
  unassigned: (
    competitionId: string,
    filter: UnassignedFilter & PageRequest = {},
  ) => ['unassigned', competitionId, filter] as const,
  unassignedFacets: (competitionId: string) =>
    ['unassigned', competitionId, 'facets'] as const,

  zipJob: (jobId: string) => ['zip-job', jobId] as const,
};
