import type { QueryClient } from '@tanstack/react-query';
import type { Category } from './categories';
import { queryKeys } from './queryKeys';

// A single edited dictionary value replaces its copy in the shared
// categories cache, so every form picking from it sees the change at once.
export function applyCategoryToCache(queryClient: QueryClient, updated: Category): void {
  queryClient.setQueryData<Category[]>(queryKeys.categories(), (prev) =>
    prev?.map((c) => (c.id === updated.id ? updated : c)),
  );
}
