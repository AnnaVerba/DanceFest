import type { PublicProgramRow } from '../../lib/program';
import type { ProgramSection } from '../../lib/programSections.types';
import { formatParticipantNumbers } from '../../lib/participantNumbers';
import { formatClock } from '../../lib/duration';
import {
  CATEGORY_NUMBER_PREFIX,
  CHEVRON_COLLAPSED,
  CHEVRON_EXPANDED,
  EMPTY_ROUTINE_NAME,
  LABEL_SEPARATOR,
  LEADER_ROLE_LABEL,
  SERVICE_ROW_LABELS,
  STUDIO_LEADER_SEPARATOR,
  TIME_RANGE_SEPARATOR,
} from './FestivalProgram.constants';
import styles from './FestivalProgram.module.css';

interface ProgramSectionBlockProps {
  section: ProgramSection;
  expanded: boolean;
  onToggle: (sectionId: string) => void;
}

// "Шехеризада, керівник Білошкап Анастасія"; just the leader when the entry
// has no studio, nothing when it has neither.
function formatStudioAndLeader(row: PublicProgramRow): string {
  const leader = row.choreographer
    ? `${LEADER_ROLE_LABEL} ${row.choreographer}`
    : null;
  return [row.studioName, leader]
    .filter(Boolean)
    .join(STUDIO_LEADER_SEPARATOR);
}

function formatTimeRange(head: PublicProgramRow): string {
  const start = formatClock(head.time);
  return head.endTime
    ? `${start}${TIME_RANGE_SEPARATOR}${formatClock(head.endTime)}`
    : start;
}

function renderRow(row: PublicProgramRow, index: number) {
  if (row.kind === 'group') {
    return (
      <div key={index} className={styles.groupRow}>
        {row.categoryNumber != null && (
          <span className={styles.num}>
            {CATEGORY_NUMBER_PREFIX}
            {row.categoryNumber}
          </span>
        )}
        <span>{row.label}</span>
      </div>
    );
  }
  if (row.kind === 'exit') {
    const studioAndLeader = formatStudioAndLeader(row);
    return (
      <div key={index} className={styles.exitRow}>
        <span className={styles.num}>
          {CATEGORY_NUMBER_PREFIX}
          {formatParticipantNumbers(row.participantNumbers ?? [])}
        </span>
        <span className={styles.grow}>
          {row.routineName ?? EMPTY_ROUTINE_NAME}
          {studioAndLeader ? `${LABEL_SEPARATOR}${studioAndLeader}` : ''}
        </span>
      </div>
    );
  }
  if (row.kind === 'section') return null;
  const suffix =
    row.kind !== 'award' && row.label ? `${LABEL_SEPARATOR}${row.label}` : '';
  return (
    <div key={index} className={styles.awardRow}>
      <span>
        {SERVICE_ROW_LABELS[row.kind]}
        {suffix}
      </span>
    </div>
  );
}

// One collapsible programme section: only its name and start – end time
// show until it is opened.
export default function ProgramSectionBlock({
  section,
  expanded,
  onToggle,
}: ProgramSectionBlockProps) {
  return (
    <div id={section.id} className={styles.section}>
      <button
        type="button"
        className={styles.sectionToggle}
        aria-expanded={expanded}
        onClick={() => onToggle(section.id)}
      >
        <span className={styles.chevron} aria-hidden="true">
          {expanded ? CHEVRON_EXPANDED : CHEVRON_COLLAPSED}
        </span>
        <span className={styles.time}>{formatTimeRange(section.head)}</span>
        <span className={styles.sectionName}>{section.head.label}</span>
      </button>
      {expanded && section.rows.map(renderRow)}
    </div>
  );
}
