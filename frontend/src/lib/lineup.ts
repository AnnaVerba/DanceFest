import { DUO_SIZE, LINEUP_LABEL, TRIO_SIZE } from './lineup.constants';

// Mirrors the server's resolveLineup: Соло / Дуо / Тріо / Група by count.
export function lineupLabel(count: number): string {
  if (count > TRIO_SIZE) return LINEUP_LABEL.GROUP;
  if (count === TRIO_SIZE) return LINEUP_LABEL.TRIO;
  if (count === DUO_SIZE) return LINEUP_LABEL.DUO;
  return LINEUP_LABEL.SOLO;
}
