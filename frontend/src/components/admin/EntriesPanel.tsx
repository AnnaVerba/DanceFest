import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import EntryEditModal from './EntryEditModal';
import { deleteEntry, getEntries } from '../../lib/entries';
import type { Entry, PagedEntries } from '../../lib/entries';
import { formatParticipantNumbers } from '../../lib/participantNumbers';
import { formatEntryAmount } from '../../lib/entryAmount';
import {
  ACTIONS_COLUMN_COUNT,
  ALL,
  AMOUNT_COLUMN_COUNT,
  BASE_COLUMN_COUNT,
  ENTRIES_SERVER_PAGE,
  IMPROV_MUSIC_LABEL,
  MUSIC_COLUMN_COUNT,
  NO_MUSIC_LABEL,
  PAGE_SIZE,
  SORT_LABELS,
} from './EntriesPanel.constants';
import type { SortKey } from './EntriesPanel.constants';
import { FEATURES } from '../../lib/features';
import { queryKeys } from '../../lib/queryKeys';
import { APPLICATIONS_STALE_TIME_MS } from '../../lib/queryClient.constants';
import styles from './EntriesPanel.module.css';

interface EntriesPanelProps {
  competitionId: string;
  canManage: boolean;
  // A read-only viewer (a coach) still sees each entry's cost; defaults to
  // whatever `canManage` allows.
  canViewAmounts?: boolean;
  onError: (message: string) => void;
}

function formatScore(score: number | null | undefined): string {
  return score == null ? '—' : score.toFixed(1);
}

function uniqueValues(entries: Entry[], pick: (e: Entry) => string | null): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const entry of entries) {
    const value = pick(entry);
    if (value && !seen.has(value)) {
      seen.add(value);
      values.push(value);
    }
  }
  return values;
}

export default function EntriesPanel({
  competitionId,
  canManage,
  canViewAmounts = canManage,
  onError,
}: EntriesPanelProps) {
  // The score column is staff-only: a non-managing viewer gets the plain
  // start list, and the server omits `score` from their entry payload.
  const showScore = FEATURES.judges && canManage;
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [ageCategory, setAgeCategory] = useState(ALL);
  const [league, setLeague] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('number');
  const [page, setPage] = useState(1);

  const entriesQuery = useInfiniteQuery({
    queryKey: queryKeys.entries(competitionId),
    queryFn: ({ pageParam }) =>
      getEntries(competitionId, { page: pageParam, pageSize: ENTRIES_SERVER_PAGE }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      const loaded = allPages.reduce((sum, p) => sum + p.rows.length, 0);
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    staleTime: APPLICATIONS_STALE_TIME_MS,
  });
  const entries = entriesQuery.data?.pages.flatMap((p) => p.rows) ?? null;
  const entriesTotal = entriesQuery.data?.pages.at(-1)?.total ?? 0;
  const loading = entriesQuery.isLoading;
  const loadingMore = entriesQuery.isFetchingNextPage;

  useEffect(() => {
    if (entriesQuery.isError) onError('Не вдалося завантажити заявки.');
  }, [entriesQuery.isError, onError]);

  const loadMoreEntries = () => {
    entriesQuery.fetchNextPage().catch(() => onError('Не вдалося завантажити ще заявки.'));
  };

  const deleteEntryMutation = useMutation({
    mutationFn: (entryId: string) => deleteEntry(competitionId, entryId),
    onSuccess: (_data, entryId) => {
      // Instant feedback: drop the row from whichever loaded page has it.
      queryClient.setQueryData<InfiniteData<PagedEntries>>(
        queryKeys.entries(competitionId),
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((p) => ({
              ...p,
              rows: p.rows.filter((e) => e.id !== entryId),
              total: p.total - 1,
            })),
          },
      );
      // Pages are fetched by server-side offset (getNextPageParam), so
      // removing one row here leaves every later, not-yet-fetched page
      // off by one. Refetch the already-loaded pages in the background so
      // their offsets are correct again before "Показати ще" loads more.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.entries(competitionId),
      });
    },
  });

  const handleDelete = async (entry: Entry) => {
    try {
      await deleteEntryMutation.mutateAsync(entry.id);
    } catch {
      onError('Не вдалося видалити заявку. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleSaved = (saved: Entry) => {
    queryClient.setQueryData<InfiniteData<PagedEntries>>(
      queryKeys.entries(competitionId),
      (old) =>
        old && {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            rows: p.rows.map((e) => (e.id === saved.id ? saved : e)),
          })),
        },
    );
    setEditingId(null);
  };

  const ageCategories = useMemo(
    () => uniqueValues(entries ?? [], (e) => e.ageCategory),
    [entries],
  );
  const leagues = useMemo(() => uniqueValues(entries ?? [], (e) => e.league), [entries]);
  const programs = useMemo(
    () => uniqueValues(entries ?? [], (e) => e.program),
    [entries],
  );

  const filtered = useMemo(() => {
    if (!entries) return [];
    const query = search.trim().toLowerCase();
    const result = entries.filter((e) => {
      if (ageCategory !== ALL && e.ageCategory !== ageCategory) return false;
      if (league !== ALL && e.league !== league) return false;
      if (program !== ALL && e.program !== program) return false;
      if (!query) return true;
      return (
        e.routineName.toLowerCase().includes(query) ||
        (e.studioName?.toLowerCase().includes(query) ?? false) ||
        (e.choreographer?.toLowerCase().includes(query) ?? false)
      );
    });

    const sorted = [...result];
    if (sort === 'name') {
      sorted.sort((a, b) => a.routineName.localeCompare(b.routineName, 'uk'));
    } else if (sort === 'score') {
      sorted.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    } else if (sort === 'newest') {
      // Заявки одного подання діляться міткою часу до секунди, тож за рівних
      // дат порядок добиває номер — інакше він виглядав би випадковим.
      sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
          b.number - a.number,
      );
    } else {
      sorted.sort((a, b) => a.number - b.number);
    }
    return sorted;
  }, [entries, search, ageCategory, league, program, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageEntries = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  const rangeFrom = filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const rangeTo = Math.min(currentPage * PAGE_SIZE, filtered.length);

  const resetPage = <T,>(setter: (value: T) => void) => (value: T) => {
    setter(value);
    setPage(1);
  };

  return (
    <section className={styles.panel}>
      <div className={styles.filters}>
        <input
          className={`${styles.field} ${styles.search}`}
          type="search"
          placeholder="Пошук за назвою, студією, хореографом..."
          aria-label="Пошук заявок"
          value={search}
          onChange={(e) => resetPage(setSearch)(e.target.value)}
        />
        <select
          className={styles.field}
          aria-label="Вікова категорія"
          value={ageCategory}
          onChange={(e) => resetPage(setAgeCategory)(e.target.value)}
        >
          <option value={ALL}>Усі вік. категорії</option>
          {ageCategories.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={styles.field}
          aria-label="Ліга"
          value={league}
          onChange={(e) => resetPage(setLeague)(e.target.value)}
        >
          <option value={ALL}>Усі ліги</option>
          {leagues.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={styles.field}
          aria-label="Програма"
          value={program}
          onChange={(e) => resetPage(setProgram)(e.target.value)}
        >
          <option value={ALL}>Усі програми</option>
          {programs.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
        <select
          className={styles.field}
          aria-label="Сортування"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
        >
          {(Object.keys(SORT_LABELS) as SortKey[])
            .filter((key) => showScore || key !== 'score')
            .map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
        </select>
      </div>

      {loading && <p className={styles.status}>Завантаження...</p>}

      {!loading && entries && entries.length === 0 && (
        <p className={styles.empty}>На цей конкурс ще не подано жодної заявки.</p>
      )}

      {!loading && entries && entries.length > 0 && (
        <>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th scope="col">№</th>
                  <th scope="col">№ учасника</th>
                  <th scope="col">Учасники</th>
                  <th scope="col">Номінація</th>
                  <th scope="col">Вік. категорія</th>
                  <th scope="col">Ліга</th>
                  <th scope="col">Програма</th>
                  <th scope="col">К-сть уч.</th>
                  <th scope="col">Студія</th>
                  <th scope="col">Хореограф</th>
                  {canManage && <th scope="col">Музика</th>}
                  {canViewAmounts && <th scope="col">Вартість</th>}
                  {showScore && <th scope="col">Бал</th>}
                  {canManage && (
                    <th scope="col" className={styles.colActions}>
                      <span hidden>Дії</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pageEntries.length === 0 && (
                  <tr>
                    <td
                      colSpan={
                        (showScore
                          ? BASE_COLUMN_COUNT
                          : BASE_COLUMN_COUNT - 1) +
                        (canViewAmounts ? AMOUNT_COLUMN_COUNT : 0) +
                        (canManage ? MUSIC_COLUMN_COUNT + ACTIONS_COLUMN_COUNT : 0)
                      }
                      className={styles.noMatches}
                    >
                      Нічого не знайдено за обраними фільтрами.
                    </td>
                  </tr>
                )}
                {pageEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className={styles.num}>{entry.number}</td>
                    <td>{formatParticipantNumbers(entry.participantNumbers)}</td>
                    <td className={styles.name}>{entry.routineName}</td>
                    <td>{entry.nomination}</td>
                    <td>{entry.ageCategory}</td>
                    <td>{entry.league}</td>
                    <td>{entry.program}</td>
                    <td>{entry.participantsCount ?? ''}</td>
                    <td>{entry.studioName}</td>
                    <td>{entry.choreographer}</td>
                    {canManage && (
                      <td className={styles.music}>
                        {entry.trackNotNeeded ? (
                          IMPROV_MUSIC_LABEL
                        ) : entry.musicUrl ? (
                          <a href={entry.musicUrl} target="_blank" rel="noreferrer">
                            {entry.musicName}
                          </a>
                        ) : (
                          (entry.musicName ?? NO_MUSIC_LABEL)
                        )}
                      </td>
                    )}
                    {canViewAmounts && <td>{formatEntryAmount(entry.amount ?? null)}</td>}
                    {showScore && (
                      <td
                        className={
                          entry.score == null
                            ? `${styles.score} ${styles.scoreEmpty}`
                            : styles.score
                        }
                      >
                        {formatScore(entry.score)}
                      </td>
                    )}
                    {canManage && (
                      <td className={styles.colActions}>
                        <button
                          className={styles.editBtn}
                          type="button"
                          aria-label={`Редагувати заявку №${entry.number}`}
                          onClick={() => setEditingId(entry.id)}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>
                        <button
                          className={styles.iconBtn}
                          type="button"
                          aria-label={`Видалити заявку №${entry.number}`}
                          onClick={() => setPendingDelete(entry)}
                        >
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                          >
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pager}>
            <span className={styles.pagerInfo}>
              Показано {rangeFrom}–{rangeTo} з {filtered.length}
            </span>
            <span className={styles.pagerNav}>
              <button
                className={styles.btnSm}
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Назад
              </button>
              <button
                className={styles.btnSm}
                type="button"
                disabled={currentPage >= pageCount}
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              >
                Далі →
              </button>
            </span>
          </div>

          {entries.length < entriesTotal && (
            <div className={styles.pager}>
              <button
                className={styles.btnSm}
                type="button"
                disabled={loadingMore}
                onClick={loadMoreEntries}
              >
                {loadingMore
                  ? 'Завантаження…'
                  : `Показати ще (завантажено ${entries.length} із ${entriesTotal})`}
              </button>
            </div>
          )}
        </>
      )}

      {editingId && (
        <EntryEditModal
          key={editingId}
          competitionId={competitionId}
          entryId={editingId}
          onClose={() => setEditingId(null)}
          onSaved={handleSaved}
        />
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити заявку?"
        description={
          pendingDelete
            ? `Видалити заявку №${pendingDelete.number} «${pendingDelete.routineName}»? Ця дія незворотна.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete) : undefined)}
      />
    </section>
  );
}
