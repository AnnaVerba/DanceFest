import type { Entry } from './entry.model';
import {
  ROUTINE_TITLE_CLOSE_QUOTE,
  ROUTINE_TITLE_OPEN_QUOTE,
} from './routine-title.constants';

// The performer as the program shows them: the dancers' names, followed by
// the number's title in quotes when one was given.
export function withRoutineTitle(
  entry: Pick<Entry, 'routineName' | 'routineTitle'>,
): string {
  const title = entry.routineTitle?.trim();
  return title
    ? `${entry.routineName} ${ROUTINE_TITLE_OPEN_QUOTE}${title}${ROUTINE_TITLE_CLOSE_QUOTE}`
    : entry.routineName;
}
