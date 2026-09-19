import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getNominationsPage } from '../../../lib/nominations';
import { queryKeys } from '../../../lib/queryKeys';
import type { NominationSelection } from './nominationSelection.types';

// The page the selection's filters and page number point at. The previous
// page stays on screen while the next one loads, so paging doesn't flash.
export function useNominationsPage(competitionId: string, selection: NominationSelection) {
  return useQuery({
    queryKey: queryKeys.nominationsPage(competitionId, selection.pageQuery),
    queryFn: () => getNominationsPage(competitionId, selection.pageQuery),
    placeholderData: keepPreviousData,
  });
}
