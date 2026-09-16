import { QueryClient } from '@tanstack/react-query';
import {
  QUERY_DEFAULT_GC_TIME_MS,
  QUERY_DEFAULT_RETRY_COUNT,
  QUERY_DEFAULT_STALE_TIME_MS,
} from './queryClient.constants';

// Created once at module scope, not inside a component — otherwise every
// re-render would spin up a fresh cache. Over one competition, an organizer
// and several coaches work at the same time, so staying fresh on window
// focus matters more than saving a request.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_DEFAULT_STALE_TIME_MS,
      gcTime: QUERY_DEFAULT_GC_TIME_MS,
      refetchOnWindowFocus: true,
      retry: QUERY_DEFAULT_RETRY_COUNT,
    },
  },
});
