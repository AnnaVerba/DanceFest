import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { getPublicEntries } from '../lib/entries';
import type { PublicEntry } from '../lib/entries';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import { PUBLIC_ENTRIES_PAGE_SIZE } from './CompetitionEntriesPage.constants';
import styles from './CompetitionEntriesPage.module.css';

// Public, read-only list of who has applied to a competition — no login
// required, no editing. Mirrors the cabinet's entry table, minus the
// organizer-only fields (payment method, choreographer, studio, city) and
// the music file itself.
export default function CompetitionEntriesPage() {
  const { id } = useParams<{ id: string }>();
  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entries, setEntries] = useState<PublicEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    getCompetition(id)
      .then((data) => {
        if (!cancelled) setCompetition(data);
      })
      .catch(() => {
        /* the table still renders without the competition name */
      });

    getPublicEntries(id, { page: 0, pageSize: PUBLIC_ENTRIES_PAGE_SIZE })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.rows);
        setTotal(data.total);
        setServerPage(0);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити заявки.');
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  const loadMore = () => {
    if (!id) return;
    setLoadingMore(true);
    getPublicEntries(id, {
      page: serverPage + 1,
      pageSize: PUBLIC_ENTRIES_PAGE_SIZE,
    })
      .then((data) => {
        setEntries((prev) => [...(prev ?? []), ...data.rows]);
        setServerPage(data.page);
        setTotal(data.total);
      })
      .catch(() => setLoadError('Не вдалося завантажити ще заявки.'))
      .finally(() => setLoadingMore(false));
  };

  if (!id) return null;

  return (
    <main className={styles.main}>
      <Link to={`/competitions/${id}`} className={styles.back}>
        ← До конкурсу
      </Link>
      <h1 className={styles.title}>Заявки{competition ? ` · ${competition.name}` : ''}</h1>

      {loadError && <p className={styles.status}>{loadError}</p>}

      {!loadError && entries === null && (
        <p className={styles.status}>Завантаження…</p>
      )}

      {entries && entries.length === 0 && (
        <p className={styles.status}>На цей конкурс ще не подано жодної заявки.</p>
      )}

      {entries && entries.length > 0 && (
        <>
          <div className={styles.tableScroll}>
            <table className={styles.entryTable}>
              <thead>
                <tr>
                  <th scope="col">№</th>
                  <th scope="col">№ учасника</th>
                  <th scope="col">Номінація</th>
                  <th scope="col">Ліга</th>
                  <th scope="col">Склад</th>
                  <th scope="col">Вік. кат.</th>
                  <th scope="col">Музика</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.number}</td>
                    <td>{formatParticipantNumbers(entry.participantNumbers)}</td>
                    <td>{entry.nomination}</td>
                    <td>{entry.league ?? '—'}</td>
                    <td>{entry.lineup ?? '—'}</td>
                    <td>{entry.ageCategory ?? '—'}</td>
                    <td>
                      {entry.improv
                        ? 'Імпровізація'
                        : entry.hasMusic
                          ? 'Завантажено'
                          : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {entries.length < total && (
            <button
              type="button"
              className={styles.loadMore}
              onClick={loadMore}
              disabled={loadingMore}
            >
              {loadingMore
                ? 'Завантаження…'
                : `Показати ще (завантажено ${entries.length} із ${total})`}
            </button>
          )}
        </>
      )}
    </main>
  );
}
