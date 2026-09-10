import { useEffect, useState } from 'react';
import { getPublicEntries } from '../lib/entries';
import type { PublicEntry } from '../lib/entries';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import { PUBLIC_ENTRIES_PAGE_SIZE } from '../pages/CompetitionEntriesPage.constants';
import styles from '../pages/CompetitionEntriesPage.module.css';

interface PublicEntriesListProps {
  competitionId: string;
}

// Public, read-only start list — who has applied to a competition. No
// login, no editing; the payment method, choreographer, studio and city
// are left out. Used on the public competition page and its deep link.
export default function PublicEntriesList({
  competitionId,
}: PublicEntriesListProps) {
  const [entries, setEntries] = useState<PublicEntry[] | null>(null);
  const [total, setTotal] = useState(0);
  const [serverPage, setServerPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getPublicEntries(competitionId, {
      page: 0,
      pageSize: PUBLIC_ENTRIES_PAGE_SIZE,
    })
      .then((data) => {
        if (cancelled) return;
        setEntries(data.rows);
        setTotal(data.total);
        setServerPage(0);
        setLoadError(null);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити заявки.');
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const loadMore = () => {
    setLoadingMore(true);
    getPublicEntries(competitionId, {
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

  if (loadError) {
    return <p className={styles.status}>{loadError}</p>;
  }
  if (entries === null) {
    return <p className={styles.status}>Завантаження…</p>;
  }
  if (entries.length === 0) {
    return (
      <p className={styles.status}>
        На цей конкурс ще не подано жодної заявки.
      </p>
    );
  }

  return (
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
  );
}
