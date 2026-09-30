import type { PublicProgramRow } from './program';
import { formatClock } from './duration';
import {
  LEADER_ROLE_LABEL,
  STUDIO_LEADER_SEPARATOR,
  TIME_RANGE_SEPARATOR,
} from './programRowFormat.constants';

// "Шехеризада, керівник Білошкап Анастасія"; just the leader when the entry
// has no studio, nothing when it has neither.
export function formatStudioAndLeader(row: PublicProgramRow): string {
  const leader = row.choreographer
    ? `${LEADER_ROLE_LABEL} ${row.choreographer}`
    : null;
  return [row.studioName, leader]
    .filter(Boolean)
    .join(STUDIO_LEADER_SEPARATOR);
}

// A section header's "09:00 – 10:30"; just the start when no end is known.
export function formatTimeRange(head: PublicProgramRow): string {
  const start = formatClock(head.time);
  return head.endTime
    ? `${start}${TIME_RANGE_SEPARATOR}${formatClock(head.endTime)}`
    : start;
}
