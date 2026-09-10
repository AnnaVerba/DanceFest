import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicProgramList from '../components/PublicProgramList';
import { getMyProgram, hasSession } from '../lib/program';
import type { MineProgram } from '../lib/program';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import { formatClock } from '../lib/duration';
import styles from './SchedulePage.module.css';

export default function SchedulePage() {
  const { id } = useParams<{ id: string }>();
  const [mine, setMine] = useState<MineProgram | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!id || !hasSession()) return;
    let cancelled = false;
    getMyProgram(id)
      .then((data) => {
        if (!cancelled) setMine(data);
      })
      .catch(() => {
        /* personal cut is optional — the full program still renders */
      });
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
            formatParticipantNumbers(exit.participantNumbers).includes(needle),
        ),
      }))
      .filter((section) => section.exits.length > 0);
  }, [mine, query]);

  const backLink = id ? (
    <Link to={`/competitions/${id}`} className={styles.back}>
      ← До конкурсу
    </Link>
  ) : null;

  if (!id) {
    return <main className={styles.main}>{backLink}</main>;
  }

  const hasHighlights =
    mine != null && mine.totals.mine + mine.totals.students > 0;

  return (
    <main className={styles.main}>
      {backLink}
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
                  <span className={styles.num}>
                    №{formatParticipantNumbers(exit.participantNumbers)}
                  </span>
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
      <PublicProgramList competitionId={id} />
    </main>
  );
}
