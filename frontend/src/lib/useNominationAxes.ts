import { useQuery } from '@tanstack/react-query';
import { getNominationAxes } from './nominations';
import { queryKeys } from './queryKeys';

// The axes change only when an admin edits the competition's template.
const AXES_STALE_TIME_MS = 5 * 60 * 1000;

// The competition's league, age, style and line-up values, shared by every
// form that picks a nomination.
export function useNominationAxes(competitionId: string) {
  return useQuery({
    queryKey: queryKeys.nominationAxes(competitionId),
    queryFn: () => getNominationAxes(competitionId),
    staleTime: AXES_STALE_TIME_MS,
  });
}
