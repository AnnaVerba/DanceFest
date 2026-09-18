import { apiRequest } from './http';
import { withPageParams } from './pagination';
import type { Paged } from './pagination';
import type {
  FinanceGroup,
  FinanceGroupQuery,
  FinanceGroupRow,
  FinanceSummary,
} from './finance.types';

// Organizer/owner, team member or admin only — enforced server-side.
export function getFinanceSummary(competitionId: string): Promise<FinanceSummary> {
  return apiRequest<FinanceSummary>(`/competitions/${competitionId}/finance`);
}

// One page of a breakdown; `search` narrows it by name on the server.
export function getFinanceGroup(
  competitionId: string,
  group: FinanceGroup,
  query: FinanceGroupQuery,
): Promise<Paged<FinanceGroupRow>> {
  const params = withPageParams(new URLSearchParams(), query.page, query.pageSize);
  if (query.search) params.set('search', query.search);
  return apiRequest<Paged<FinanceGroupRow>>(
    `/competitions/${competitionId}/finance/${group}?${params}`,
  );
}
