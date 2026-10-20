import type { PublicProgramRow } from '../../lib/program';
import type { ProgramSection } from '../../lib/programSections.types';
import type { MineMark, SectionMarks } from '../../lib/programHighlight.types';
import { formatMarkedParticipantNumbers } from '../../lib/participantNumbers';
import {
  formatLeaders,
  formatTimeRange,
} from '../../lib/programRowFormat';
import { formatClock } from '../../lib/duration';
import {
  EMPTY_ROUTINE_NAME,
  LABEL_SEPARATOR,
  MINE_MARK_TAGS,
  SERVICE_ROW_LABELS,
} from './FestivalProgram.constants';
import { formatMarkedNominationNumber } from '../../lib/programNumbers';
import styles from './FestivalProgram.module.css';

interface ProgramSectionBlockProps {
  section: ProgramSection;
  marks: SectionMarks;
}

// A colour and a tag, so the highlight survives both themes and a
// black-and-white printout.
function markClass(mark: MineMark): string {
  return mark === 'mine' ? styles.markMine : styles.markStudent;
}

function MarkTag({ mark }: { mark: MineMark }) {
  return (
    <span
      className={
        mark === 'mine' ? styles.tag : `${styles.tag} ${styles.tagStudent}`
      }
    >
      {MINE_MARK_TAGS[mark]}
    </span>
  );
}

function renderRow(
  row: PublicProgramRow,
  index: number,
  mark: MineMark | undefined,
) {
  if (row.kind === 'group') {
    return (
      <div
        key={index}
        className={`${styles.groupRow} ${mark ? markClass(mark) : ''}`}
      >
        {row.categoryNumber != null && (
          <span className={styles.groupNum}>
            {formatMarkedNominationNumber(row.categoryNumber)}
          </span>
        )}
        <span className={styles.grow}>{row.label}</span>
        {mark && <MarkTag mark={mark} />}
        <span className={styles.groupTime}>{formatClock(row.time)}</span>
      </div>
    );
  }
  if (row.kind === 'exit') {
    // Head and trainer only — which studio a dancer is from stays out of
    // the programme (TASK-15).
    const leaders = formatLeaders(row);
    return (
      <div key={index} className={styles.exitRow}>
        <span className={styles.num}>
          {formatMarkedParticipantNumbers(row.participantNumbers ?? [])}
        </span>
        <span className={styles.grow}>
          {row.routineName ?? EMPTY_ROUTINE_NAME}
          {leaders ? `${LABEL_SEPARATOR}${leaders}` : ''}
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

// One programme section, shown whole: its name and start – end time, then
// every nomination with its clock time. The viewer's nominations are
// highlighted, and so is a section holding any.
export default function ProgramSectionBlock({
  section,
  marks,
}: ProgramSectionBlockProps) {
  return (
    <div id={section.id} className={styles.section}>
      <div className={styles.sectionHead}>
        <span className={styles.sectionName}>{section.head.label}</span>
        <span className={styles.sectionEnd}>
          <span className={styles.time}>{formatTimeRange(section.head)}</span>
          {marks.section && <MarkTag mark={marks.section} />}
        </span>
      </div>
      {section.rows.map((row, index) =>
        renderRow(row, index, marks.groups.get(index)),
      )}
    </div>
  );
}
