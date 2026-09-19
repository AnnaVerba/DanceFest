import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

// A new entry or any schedule edit can move exits between the sections and
// the unassigned pool, and shifts the times every program view shows — so
// all of them are refetched together.
export async function refreshProgram(
  queryClient: QueryClient,
  competitionId: string,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.sectionsScope(competitionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.unassignedScope(competitionId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.timingScope(competitionId) }),
  ]);
}
