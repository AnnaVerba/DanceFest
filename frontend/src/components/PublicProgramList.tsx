import { useEffect, useState } from 'react';
import { getPublicProgram } from '../lib/program';
import type { PublicProgramRow } from '../lib/program';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import { formatClock, formatDuration } from '../lib/duration';
import styles from '../pages/SchedulePage.module.css';

interface PublicProgramListProps {
  competitionId: string;
}

// The full public festival program — service rows with times only, paged
// by section. No login. Rendered on its deep-link page and inline on the
// public competition page.
export default function PublicProgramList({
  competitionId,
}: PublicProgramListProps) {
  const [rows, setRows] = useState<PublicProgramRow[] | null>(null);
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const hasMore = page + 1 < pageCount;

  useEffect(() => {
    let cancelled = false;
    getPublicProgram(competitionId)
      .then((paged) => {
        if (cancelled) return;
        setRows(paged.rows);
        setPage(paged.page);
        setPageCount(paged.pageCount);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити програму.');
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    getPublicProgram(competitionId, { page: page + 1 })
      .then((paged) => {
        setRows((prev) => [...(prev ?? []), ...paged.rows]);
        setPage(paged.page);
        setPageCount(paged.pageCount);
      })
      .catch(() => setLoadError('Не вдалося завантажити програму.'))
      .finally(() => setLoadingMore(false));
  };

  if (loadError) {
    return <p className={styles.status}>{loadError}</p>;
  }
  if (rows === null) {
    return <p className={styles.status}>Завантаження…</p>;
  }
  if (rows.length === 0) {
    return <p className={styles.status}>Розклад ще не опубліковано.</p>;
  }

  const multiDay = new Set(rows.map((r) => r.dayId)).size > 1;

  return (
    <>
      {rows.map((row, index) => {
        const dayHead =
          multiDay && rows[index - 1]?.dayId !== row.dayId ? (
            <h3 key={`d${index}`} className={styles.dayHeading}>
              {row.dayDate ?? ''}
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
            <div className={styles.groupRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span>{row.label}</span>
            </div>
          );
        } else if (row.kind === 'exit') {
          const studioCoach = [row.studioName, row.choreographer]
            .filter(Boolean)
            .join(' · ');
          body = (
            <div className={styles.exitRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span className={styles.num}>
                №{formatParticipantNumbers(row.participantNumbers ?? [])}
              </span>
              <span className={styles.grow}>
                {row.routineName ?? '—'}
                {studioCoach ? ` · ${studioCoach}` : ''}
              </span>
              <span>{formatDuration(row.durationSeconds ?? null)}</span>
            </div>
          );
        } else {
          body = (
            <div className={styles.awardRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span>
                {row.kind === 'award'
                  ? 'Нагородження'
                  : row.kind === 'break'
                    ? `Перерва${row.label ? ` · ${row.label}` : ''}`
                    : `Гала-шоу${row.label ? ` · ${row.label}` : ''}`}
              </span>
            </div>
          );
        }

        return (
          <div key={index}>
            {dayHead}
            {body}
          </div>
        );
      })}

      {hasMore && (
        <button
          type="button"
          className={styles.loadMore}
          onClick={loadMore}
          disabled={loadingMore}
        >
          {loadingMore ? 'Завантаження…' : 'Показати ще'}
        </button>
      )}
    </>
  );
}
