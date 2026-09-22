import { LIST_QUERY_SEPARATOR } from './nominations.constants';

// `?ages=7&ages=9` приходить від Express масивом — зводимо його до того ж
// рядка через кому, що й `?ages=7,9`.
export function joinListQuery(raw?: string | string[]): string | undefined {
  return Array.isArray(raw) ? raw.join(LIST_QUERY_SEPARATOR) : raw;
}
