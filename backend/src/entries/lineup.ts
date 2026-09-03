export const LINEUP_LABELS = {
  SOLO: 'Соло',
  DUO: 'Дуо',
  TRIO: 'Тріо',
  GROUP: 'Група',
} as const;

const DUO_SIZE = 2;
const TRIO_SIZE = 3;

// Соло / Дуо / Тріо / Група — decided purely by how many dancers are in the
// number, never chosen by the applicant.
export function resolveLineup(participantCount: number): string {
  if (participantCount >= TRIO_SIZE + 1) return LINEUP_LABELS.GROUP;
  if (participantCount === TRIO_SIZE) return LINEUP_LABELS.TRIO;
  if (participantCount === DUO_SIZE) return LINEUP_LABELS.DUO;
  return LINEUP_LABELS.SOLO;
}
