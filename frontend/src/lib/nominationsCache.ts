import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

// Any change to a competition's nominations can move its pages, the venue
// summary and the per-venue counts — and a venue change decides which venue
// filter shows its exits in the program — so all of them are refetched.
export function refreshNominations(queryClient: QueryClient, competitionId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.nominationsScope(competitionId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.venues(competitionId) });
  void queryClient.invalidateQueries({ queryKey: queryKeys.sectionsScope(competitionId) });
}
