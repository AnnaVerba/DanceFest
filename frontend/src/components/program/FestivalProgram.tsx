import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getMyProgram, getPublicProgram, hasSession } from '../../lib/program';
import type { MineProgram, PublicProgramRow } from '../../lib/program';
import { formatParticipantNumbers } from '../../lib/participantNumbers';
import { formatClock, formatDuration } from '../../lib/duration';
import { getVenues } from '../../lib/venues';
import { queryKeys } from '../../lib/queryKeys';
import { opensProgram, programHeading } from '../../lib/programHeading';
import {
  EMPTY_ROUTINE_NAME,
  FULL_PROGRAM_TITLE,
  LABEL_SEPARATOR,
  LOAD_MORE_LABEL,
  MY_PERFORMANCE_TAG,
  MY_PERFORMANCES_LABEL,
  MY_PROGRAM_TITLE,
  MY_STUDENT_TAG,
  MY_STUDENTS_LABEL,
  PROGRAM_LOAD_ERROR,
  PROGRAM_LOADING_LABEL,
  PROGRAM_NOT_PUBLISHED_LABEL,
  PROGRAM_SUBTITLE,
  SEARCH_PLACEHOLDER,
  SERVICE_ROW_LABELS,
} from './FestivalProgram.constants';
import styles from './FestivalProgram.module.css';

interface FestivalProgramProps {
  competitionId: string;
}

// The read-only festival programme for everyone who does not edit it: a
// guest gets the full programme, a signed-in dancer or coach also gets their
// own performances highlighted on top.
export default function FestivalProgram({ competitionId }: FestivalProgramProps) {
  const [publicRows, setPublicRows] = useState<PublicProgramRow[] | null>(null);
  const [programPage, setProgramPage] = useState(0);
  const [programPageCount, setProgramPageCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mine, setMine] = useState<MineProgram | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  // Venue names for the per-venue headings; without them the program still
  // reads fine, so a failure here stays silent.
  const venuesQuery = useQuery({
    queryKey: queryKeys.venues(competitionId),
    queryFn: () => getVenues(competitionId),
  });
  const venueNames = useMemo(
    () => new Map((venuesQuery.data ?? []).map((v) => [v.id, v.name])),
    [venuesQuery.data],
  );

  const hasMore = programPage + 1 < programPageCount;

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    getPublicProgram(competitionId, { page: programPage + 1 })
      .then((paged) => {
        setPublicRows((prev) => [...(prev ?? []), ...paged.rows]);
        setProgramPage(paged.page);
        setProgramPageCount(paged.pageCount);
      })
      .catch(() => setLoadError(PROGRAM_LOAD_ERROR))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    let cancelled = false;

    getPublicProgram(competitionId)
      .then((paged) => {
        if (cancelled) return;
        setPublicRows(paged.rows);
        setProgramPage(paged.page);
        setProgramPageCount(paged.pageCount);
      })
      .catch(() => {
        if (!cancelled) setLoadError(PROGRAM_LOAD_ERROR);
      });

    if (hasSession()) {
      getMyProgram(competitionId)
        .then((data) => {
          if (!cancelled) setMine(data);
        })
        .catch(() => {
          /* personal cut is optional — the full programme still renders */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const filteredMine = useMemo(() => {
    if (!mine) return null;
    const needle = query.trim().toLowerCase();
    if (!needle) return mine.sections;
    return mine.sections
      .map((section) => ({
        ...section,
        exits: section.exits.filter(
          (exit) =>
            exit.performerName.toLowerCase().includes(needle) ||
            formatParticipantNumbers(exit.participantNumbers).includes(needle),
        ),
      }))
      .filter((section) => section.exits.length > 0);
  }, [mine, query]);

  if (loadError) {
    return <p className={styles.status}>{loadError}</p>;
  }

  if (!publicRows) {
    return <p className={styles.status}>{PROGRAM_LOADING_LABEL}</p>;
  }

  const hasHighlights =
    mine != null && mine.totals.mine + mine.totals.students > 0;

  return (
    <div>
      <p className={styles.subtitle}>{PROGRAM_SUBTITLE}</p>

      {hasHighlights && mine && (
        <div className={styles.summary}>
          {mine.totals.mine > 0 && (
            <span>
              {MY_PERFORMANCES_LABEL}: {mine.totals.mine}
            </span>
          )}
          {mine.totals.students > 0 && (
            <span>
              {MY_STUDENTS_LABEL}: {mine.totals.students}
            </span>
          )}
        </div>
      )}

      {filteredMine && filteredMine.length > 0 && (
        <>
          <h2 className={styles.sectionName}>{MY_PROGRAM_TITLE}</h2>
          <input
            className={styles.search}
            placeholder={SEARCH_PLACEHOLDER}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filteredMine.map((section) => (
            <div key={section.id} className={styles.section}>
              <div className={styles.sectionHead}>
                <span className={styles.time}>{formatClock(section.time)}</span>
                <h3 className={styles.sectionName}>{section.name}</h3>
              </div>
              {section.exits.map((exit) => (
                <div
                  key={`${exit.number}-${exit.time}`}
                  className={`${styles.exitRow} ${
                    exit.isMine
                      ? styles.exitMine
                      : exit.isMyStudent
                        ? styles.exitStudent
                        : ''
                  }`}
                >
                  <span className={styles.time}>
                    {formatClock(exit.time, true)}
                  </span>
                  <span className={styles.num}>
                    №{formatParticipantNumbers(exit.participantNumbers)}
                  </span>
                  <span className={styles.grow}>
                    {exit.groupLabel} — {exit.performerName}
                  </span>
                  {exit.isMine && (
                    <span className={styles.tag}>{MY_PERFORMANCE_TAG}</span>
                  )}
                  {exit.isMyStudent && (
                    <span className={`${styles.tag} ${styles.tagStudent}`}>
                      {MY_STUDENT_TAG}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      <h2 className={styles.sectionName}>{FULL_PROGRAM_TITLE}</h2>
      {publicRows.length === 0 && (
        <p className={styles.status}>{PROGRAM_NOT_PUBLISHED_LABEL}</p>
      )}
      {publicRows.map((row, index) => {
        const heading = opensProgram(row, publicRows[index - 1]) ? (
          <h3 className={styles.dayHeading}>
            {programHeading(row.dayDate ?? '', row.venueId, venueNames)}
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
            .join(LABEL_SEPARATOR);
          body = (
            <div className={styles.exitRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span className={styles.num}>
                №{formatParticipantNumbers(row.participantNumbers ?? [])}
              </span>
              <span className={styles.grow}>
                {row.routineName ?? EMPTY_ROUTINE_NAME}
                {studioCoach ? `${LABEL_SEPARATOR}${studioCoach}` : ''}
              </span>
              <span>{formatDuration(row.durationSeconds ?? null)}</span>
            </div>
          );
        } else {
          const suffix =
            row.kind !== 'award' && row.label
              ? `${LABEL_SEPARATOR}${row.label}`
              : '';
          body = (
            <div className={styles.awardRow}>
              <span className={styles.time}>{formatClock(row.time, true)}</span>
              <span>
                {SERVICE_ROW_LABELS[row.kind]}
                {suffix}
              </span>
            </div>
          );
        }

        return (
          <div key={index}>
            {heading}
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
          {loadingMore ? PROGRAM_LOADING_LABEL : LOAD_MORE_LABEL}
        </button>
      )}
    </div>
  );
}
