import { Fragment } from 'react';
import type { PublicProgramRow } from '../../../lib/program';
import type { CompetitionDay } from '../../../lib/schedule';
import { formatClock } from '../../../lib/duration';
import styles from './Schedule.module.css';

interface ProgramPosterProps {
  rows: PublicProgramRow[];
  days?: CompetitionDay[];
}

const KIND_LABEL: Record<'award' | 'break' | 'gala', string> = {
  award: 'Нагородження',
  break: 'Перерва',
  gala: 'Гала-шоу',
};

// The logged-out audience view — service rows only, no names or numbers.
export default function ProgramPoster({ rows, days = [] }: ProgramPosterProps) {
  if (rows.length === 0) {
    return <p className={styles.empty}>Публічна програма ще порожня.</p>;
  }

  const multiDay = new Set(rows.map((r) => r.dayId)).size > 1;
  const dayLabel = (row: PublicProgramRow) => {
    const day = days.find((d) => d.id === row.dayId);
    return day ? (day.label ?? day.date) : (row.dayDate ?? '');
  };

  return (
    <div className={styles.card}>
      {rows.map((row, index) => {
        const dayHeader =
          multiDay && rows[index - 1]?.dayId !== row.dayId ? (
            <div key={`day-${index}`} className={styles.sectionHead}>
              <h3 className={styles.sectionName}>{dayLabel(row)}</h3>
            </div>
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
            {dayHeader}
            {body}
          </Fragment>
        );
      })}
    </div>
  );
}
