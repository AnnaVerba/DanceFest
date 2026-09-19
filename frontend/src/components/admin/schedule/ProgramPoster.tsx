import { Fragment } from 'react';
import type { PublicProgramRow } from '../../../lib/program';
import type { CompetitionDay } from '../../../lib/schedule';
import type { Venue } from '../../../lib/venues';
import { opensProgram, programHeading } from '../../../lib/programHeading';
import { formatParticipantNumbers } from '../../../lib/participantNumbers';
import { formatClock, formatDuration } from '../../../lib/duration';
import styles from './Schedule.module.css';

interface ProgramPosterProps {
  rows: PublicProgramRow[];
  days?: CompetitionDay[];
  venues?: Venue[];
}

const KIND_LABEL: Record<'award' | 'break' | 'gala', string> = {
  award: 'Нагородження',
  break: 'Перерва',
  gala: 'Гала-шоу',
};

function studioAndCoach(row: PublicProgramRow): string {
  return [row.studioName, row.choreographer].filter(Boolean).join(' · ');
}

// The festival programme, same for everyone: section starts, nomination
// blocks, every performance (participant number, routine, studio + coach,
// length), and the award.
export default function ProgramPoster({
  rows,
  days = [],
  venues = [],
}: ProgramPosterProps) {
  if (rows.length === 0) {
    return <p className={styles.empty}>Публічна програма ще порожня.</p>;
  }

  const venueNames = new Map(venues.map((venue) => [venue.id, venue.name]));
  const dayLabel = (row: PublicProgramRow) => {
    const day = days.find((d) => d.id === row.dayId);
    return day ? (day.label ?? day.date) : (row.dayDate ?? '');
  };

  return (
    <div className={styles.card}>
      {rows.map((row, index) => {
        const heading = opensProgram(row, rows[index - 1]) ? (
          <h3 className={styles.programHeading}>
            {programHeading(dayLabel(row), row.venueId, venueNames)}
          </h3>
        ) : null;

        let body;
        if (row.kind === 'section') {
          body = (
            <div className={styles.sectionHead}>
              <span className={styles.time}>{formatClock(row.time)}</span>
              <h3 className={styles.sectionName}>{row.label}</h3>
            </div>
          );
        } else if (row.kind === 'group') {
          body = (
            <div className={styles.groupHead}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span>{row.label}</span>
            </div>
          );
        } else if (row.kind === 'exit') {
          body = (
            <div className={styles.awardRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span className={styles.num}>
                №{formatParticipantNumbers(row.participantNumbers ?? [])}
              </span>
              <span className={styles.grow}>
                {row.routineName ?? '—'}
                {studioAndCoach(row) ? ` · ${studioAndCoach(row)}` : ''}
              </span>
              <span>{formatDuration(row.durationSeconds ?? null)}</span>
            </div>
          );
        } else {
          body = (
            <div className={styles.awardRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span>
                {KIND_LABEL[row.kind]}
                {row.label ? ` · ${row.label}` : ''}
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
