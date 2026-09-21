import type { Entry } from '../entries/entry.model';
import { IMPROVISATION_PROGRAM_NAME_STEM } from './tracks.constants';

// An improvisation has no track: either the entry itself is flagged, or it
// is the improvisation program of a special category.
export function isImprovisationEntry(
  entry: Pick<Entry, 'improv' | 'program'>,
): boolean {
  if (entry.improv) return true;
  return (
    entry.program?.trim().toLowerCase().startsWith(IMPROVISATION_PROGRAM_NAME_STEM) ??
    false
  );
}
