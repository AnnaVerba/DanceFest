import type { PublicProgramRow } from '../../lib/program';
import type { ProgramSection } from '../../lib/programSections.types';
import type { MineMark, SectionMarks } from '../../lib/programHighlight.types';
import { formatMarkedParticipantNumbers } from '../../lib/participantNumbers';
import {
  formatStudioAndLeader,
  formatTimeRange,
} from '../../lib/programRowFormat';
import {
  CHEVRON_COLLAPSED,
  CHEVRON_EXPANDED,
  EMPTY_ROUTINE_NAME,
  LABEL_SEPARATOR,
  MINE_MARK_TAGS,
  SERVICE_ROW_LABELS,
} from './FestivalProgram.constants';
import { formatMarkedNominationNumber } from '../../lib/programNumbers';
import styles from './FestivalProgram.module.css';

interface ProgramSectionBlockProps {
  section: ProgramSection;
  expanded: boolean;
  marks: SectionMarks;
  onToggle: (sectionId: string) => void;
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
      </div>
    );
  }
  if (row.kind === 'exit') {
    const studioAndLeader = formatStudioAndLeader(row);
    return (
      <div key={index} className={styles.exitRow}>
        <span className={styles.num}>
          {formatMarkedParticipantNumbers(row.participantNumbers ?? [])}
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
// show until it is opened. The viewer's nominations are highlighted, and so
// is a section holding any, so they know which one to open.
export default function ProgramSectionBlock({
  section,
  expanded,
  marks,
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
        <span className={styles.sectionStart}>
          <span className={styles.chevron} aria-hidden="true">
            {expanded ? CHEVRON_EXPANDED : CHEVRON_COLLAPSED}
          </span>
          <span className={styles.sectionName}>{section.head.label}</span>
        </span>
        <span className={styles.sectionEnd}>
          <span className={styles.time}>{formatTimeRange(section.head)}</span>
          {marks.section && <MarkTag mark={marks.section} />}
        </span>
      </button>
      {expanded &&
        section.rows.map((row, index) =>
          renderRow(row, index, marks.groups.get(index)),
        )}
    </div>
  );
}
