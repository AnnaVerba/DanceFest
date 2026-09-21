import { IMPROVISATION_ROW_KEY_SUFFIX } from './nominationRowKey.constants';

// One key per row of the apply form. A nomination is one row, and the
// improvisation it allows is a second, separate row — so the nomination id
// alone does not identify a row.
export function nominationRowKey(
  nominationId: string,
  improv: boolean,
): string {
  return improv ? `${nominationId}${IMPROVISATION_ROW_KEY_SUFFIX}` : nominationId;
}
