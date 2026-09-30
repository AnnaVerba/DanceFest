import { Fragment, useState } from 'react';
import type { PublicProgramRow } from '../../../lib/program';
import type { CompetitionDay } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { opensProgram, programHeading } from '../../../lib/programHeading';
import { formatMarkedParticipantNumbers } from '../../../lib/participantNumbers';
import {
  formatStudioAndLeader,
  formatTimeRange,
} from '../../../lib/programRowFormat';
import { formatMarkedNominationNumber } from '../../../lib/programNumbers';
import {
  COLLAPSE_ALL_LABEL,
  EMPTY_ROUTINE_NAME,
  EXPAND_ALL_LABEL,
  LABEL_SEPARATOR,
  SERVICE_ROW_LABELS,
} from '../../program/FestivalProgram.constants';
import type { SectionCollapse } from './sectionCollapse.types';
import {
  isSectionCollapsed,
  sectionsCollapsed,
  toggleSection,
} from './sectionCollapse';
import { POSTER_SECTION_KEY_SEPARATOR } from './programPoster.constants';
import styles from './Schedule.module.css';
import programStyles from './program.module.css';

interface ProgramPosterProps {
  rows: PublicProgramRow[];
  days?: CompetitionDay[];
  venues?: Venue[];
}

function sectionKeyOf(row: PublicProgramRow): string {
  return [row.dayId, row.venueId ?? '', row.label ?? ''].join(
    POSTER_SECTION_KEY_SEPARATOR,
  );
}

// The festival programme, same for everyone: each section's start – end,
// numbered nomination blocks, every performance (participant number, routine,
// studio + leader), and the award — no per-row clock times.
export default function ProgramPoster({
  rows,
  days = [],
  venues = [],
}: ProgramPosterProps) {
  // Collapsed by section, so a reader opens only their own section.
  const [collapse, setCollapse] = useState<SectionCollapse>(
    sectionsCollapsed(true),
  );

  if (rows.length === 0) {
    return <p className={styles.empty}>Публічна програма ще порожня.</p>;
  }

  const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]));
  const dayLabel = (row: PublicProgramRow) => {
    const day = days.find((d) => d.id === row.dayId);
    return day ? (day.label ?? day.date) : (row.dayDate ?? '');
  };

  let sectionCollapsed = false;

  return (
    <div className={styles.card}>
      <div className={programStyles.filterRow}>
        <button
          type="button"
          className={programStyles.ghostBtn}
          onClick={() => setCollapse(sectionsCollapsed(true))}
        >
          {COLLAPSE_ALL_LABEL}
        </button>
        <button
          type="button"
          className={programStyles.ghostBtn}
          onClick={() => setCollapse(sectionsCollapsed(false))}
        >
          {EXPAND_ALL_LABEL}
        </button>
      </div>
      {rows.map((row, index) => {
        if (row.kind === 'section') {
          sectionCollapsed = isSectionCollapsed(collapse, sectionKeyOf(row));
        } else if (sectionCollapsed) {
          return null;
        }
        const heading = opensProgram(row, rows[index - 1]) ? (
          <h3 className={styles.programHeading}>
            {programHeading(dayLabel(row), row.venueId, venueNames)}
          </h3>
        ) : null;

        let body;
        if (row.kind === 'section') {
          body = (
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionName}>
                <button
                  type="button"
                  className={programStyles.collapseBtn}
                  onClick={() =>
                    setCollapse((prev) => toggleSection(prev, sectionKeyOf(row)))
                  }
                >
                  {sectionCollapsed ? '▸' : '▾'}
                </button>{' '}
                {row.label}
              </h3>
              <span className={styles.time}>{formatTimeRange(row)}</span>
            </div>
          );
        } else if (row.kind === 'group') {
          body = (
            <div className={styles.groupHead}>
              {row.categoryNumber != null && (
                <span className={styles.groupNum}>
                  {formatMarkedNominationNumber(row.categoryNumber)}
                </span>
              )}
              <span>{row.label}</span>
            </div>
          );
        } else if (row.kind === 'exit') {
          const studioAndLeader = formatStudioAndLeader(row);
          body = (
            <div className={styles.awardRow}>
              <span className={styles.num}>
                {formatMarkedParticipantNumbers(row.participantNumbers ?? [])}
              </span>
              <span className={styles.grow}>
                {row.routineName ?? EMPTY_ROUTINE_NAME}
                {studioAndLeader ? `${LABEL_SEPARATOR}${studioAndLeader}` : ''}
              </span>
            </div>
          );
        } else {
          body = (
            <div className={styles.awardRow}>
              <span>
                {SERVICE_ROW_LABELS[row.kind]}
                {row.label ? `${LABEL_SEPARATOR}${row.label}` : ''}
              </span>
            </div>
          );
        }

        return (
          <Fragment key={index}>
            {heading}
            {body}
          </Fragment>
        );
      })}
    </div>
  );
}
