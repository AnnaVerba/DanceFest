import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  getMyProgram,
  getPublicProgram,
  hasSession,
} from '../lib/program';
import type { MineProgram, PublicProgramRow } from '../lib/program';
import { formatClock } from '../lib/duration';
import styles from './SchedulePage.module.css';

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [publicRows, setPublicRows] = useState<PublicProgramRow[] | null>(null);
  const [programPage, setProgramPage] = useState(0);
  const [programPageCount, setProgramPageCount] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [mine, setMine] = useState<MineProgram | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const hasMore = programPage + 1 < programPageCount;

  const loadMore = () => {
    if (!id || loadingMore || !hasMore) return;
    setLoadingMore(true);
    getPublicProgram(id, { page: programPage + 1 })
      .then((paged) => {
        setPublicRows((prev) => [...(prev ?? []), ...paged.rows]);
        setProgramPage(paged.page);
        setProgramPageCount(paged.pageCount);
      })
      .catch(() => setLoadError('Не вдалося завантажити програму.'))
      .finally(() => setLoadingMore(false));
  };

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getPublicProgram(id)
      .then((paged) => {
        if (cancelled) return;
        setPublicRows(paged.rows);
        setProgramPage(paged.page);
        setProgramPageCount(paged.pageCount);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити програму.');
      });

    if (hasSession()) {
      getMyProgram(id)
        .then((data) => {
          if (!cancelled) setMine(data);
        })
        .catch(() => {
          /* personal cut is optional — the poster still renders */
        });
    }

    return () => {
      cancelled = true;
    };
  }, [id]);

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
            String(exit.number).includes(needle),
        ),
      }))
      .filter((section) => section.exits.length > 0);
  }, [mine, query]);

  if (loadError) {
    return (
      <main className={styles.main}>
        <p className={styles.status}>{loadError}</p>
      </main>
    );
  }

  if (!publicRows) {
    return (
      <main className={styles.main}>
        <p className={styles.status}>Завантаження…</p>
      </main>
    );
  }

  const hasHighlights =
    mine != null && mine.totals.mine + mine.totals.students > 0;

  return (
    <main className={styles.main}>
      <h1 className={styles.title}>Програма фестивалю</h1>
      <p className={styles.subtitle}>
        Час кожного відділення й блоку номінацій. Точний порядок може
        незначно зсуватися по ходу дня.
      </p>

      {hasHighlights && mine && (
        <div className={styles.summary}>
          {mine.totals.mine > 0 && <span>Ваші виступи: {mine.totals.mine}</span>}
          {mine.totals.students > 0 && (
            <span>Ваші учні: {mine.totals.students}</span>
          )}
        </div>
      )}

      {filteredMine && filteredMine.length > 0 && (
        <>
          <h2 className={styles.sectionName}>Ваша програма</h2>
          <input
            className={styles.search}
            placeholder="Пошук за прізвищем або номером"
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
                  <span className={styles.num}>№{exit.number}</span>
                  <span className={styles.grow}>
                    {exit.groupLabel} — {exit.performerName}
                  </span>
                  {exit.isMine && <span className={styles.tag}>Ваш виступ</span>}
                  {exit.isMyStudent && (
                    <span className={`${styles.tag} ${styles.tagStudent}`}>
                      Ваш учень
                    </span>
                  )}
                </div>
              ))}
            </div>
          ))}
        </>
      )}

      <h2 className={styles.sectionName}>Повна програма</h2>
      {publicRows.length === 0 && (
        <p className={styles.status}>Розклад ще не опубліковано.</p>
      )}
      {(() => {
        const multiDay = new Set(publicRows.map((r) => r.dayId)).size > 1;
        return publicRows.map((row, index) => {
          const dayHead =
            multiDay && publicRows[index - 1]?.dayId !== row.dayId ? (
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
                <span className={styles.time}>
                  {formatClock(row.time, true)}
                </span>
                <span>{row.label}</span>
              </div>
            );
          } else {
            body = (
              <div className={styles.awardRow}>
                <span className={styles.time}>
                  {formatClock(row.time, true)}
                </span>
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
        });
      })()}

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
    </main>
  );
}
