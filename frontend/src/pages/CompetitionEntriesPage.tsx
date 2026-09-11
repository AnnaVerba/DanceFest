import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { getCompetition } from '../lib/competitions';
import { getPublicEntries } from '../lib/entries';
import { formatParticipantNumbers } from '../lib/participantNumbers';
import { queryKeys } from '../lib/queryKeys';
import { PUBLIC_ENTRIES_PAGE_SIZE } from './CompetitionEntriesPage.constants';
import styles from './CompetitionEntriesPage.module.css';

// Public, read-only list of who has applied to a competition — no login
// required, no editing. Mirrors the cabinet's entry table, minus the
// organizer-only fields (payment method, choreographer, studio, city) and
// the music file itself.
export default function CompetitionEntriesPage() {
  const { id } = useParams<{ id: string }>();

  const competitionQuery = useQuery({
    queryKey: queryKeys.competition(id ?? ''),
    queryFn: () => getCompetition(id!),
    enabled: !!id,
    retry: false,
  });
  const competition = competitionQuery.data ?? null; // absent name still renders the table

  const entriesQuery = useInfiniteQuery({
    queryKey: queryKeys.publicEntries(id ?? ''),
    queryFn: ({ pageParam }) =>
      getPublicEntries(id!, { page: pageParam, pageSize: PUBLIC_ENTRIES_PAGE_SIZE }),
    enabled: !!id,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.rows.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });
  const entries = entriesQuery.data?.pages.flatMap((p) => p.rows) ?? null;
  const total = entriesQuery.data?.pages.at(-1)?.total ?? 0;
  const loadingMore = entriesQuery.isFetchingNextPage;
  const loadError = entriesQuery.isError ? 'Не вдалося завантажити заявки.' : null;
  const loadMore = () => void entriesQuery.fetchNextPage();

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
