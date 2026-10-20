import type { PublicProgramRow } from './program';
import { formatClock } from './duration';
import {
  LEADER_ROLE_LABEL,
  STUDIO_LEADER_SEPARATOR,
  TIME_RANGE_SEPARATOR,
  TRAINER_ROLE_LABEL,
} from './programRowFormat.constants';

// What formatLeaders reads off a program row or a schedule exit.
interface LeaderNames {
  choreographer?: string | null;
  instructorName?: string | null;
}

// "керівник Білошкап Анастасія, тренер Іваненко Олена" — the studio head
// and the dancers' trainer. A head who trains the dancers themself is named
// once: "керівник, тренер Коваль Ольга".
export function formatLeaders(row: LeaderNames): string {
  if (row.choreographer && row.choreographer === row.instructorName) {
    return `${LEADER_ROLE_LABEL}${STUDIO_LEADER_SEPARATOR}${TRAINER_ROLE_LABEL} ${row.choreographer}`;
  }
  const leader = row.choreographer
    ? `${LEADER_ROLE_LABEL} ${row.choreographer}`
    : null;
  const trainer = row.instructorName
    ? `${TRAINER_ROLE_LABEL} ${row.instructorName}`
    : null;
  return [leader, trainer].filter(Boolean).join(STUDIO_LEADER_SEPARATOR);
}

// A section header's "09:00 – 10:30"; just the start when no end is known.
export function formatTimeRange(head: PublicProgramRow): string {
  const start = formatClock(head.time);
  return head.endTime
    ? `${start}${TIME_RANGE_SEPARATOR}${formatClock(head.endTime)}`
    : start;
}
