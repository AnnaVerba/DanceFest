import { useEffect, useMemo, useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { InfiniteData } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import { deleteEntry, getEntries } from '../../lib/entries';
import type { Entry, PagedEntries } from '../../lib/entries';
import { formatParticipantNumbers } from '../../lib/participantNumbers';
import {
  ACTIONS_COLUMN_COUNT,
  ALL,
  BASE_COLUMN_COUNT,
  ENTRIES_SERVER_PAGE,
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
  onError: (message: string) => void;
}

function formatScore(score: number | null): string {
  return score === null ? '—' : score.toFixed(1);
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
  onError,
}: EntriesPanelProps) {
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  const [search, setSearch] = useState('');
  const [nomination, setNomination] = useState(ALL);
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

  const nominations = useMemo(
    () => uniqueValues(entries ?? [], (e) => e.nomination),
    [entries],
  );
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
      if (nomination !== ALL && e.nomination !== nomination) return false;
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
    } else {
      sorted.sort((a, b) => a.number - b.number);
    }
    return sorted;
  }, [entries, search, nomination, ageCategory, league, program, sort]);

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
          aria-label="Номінація"
          value={nomination}
          onChange={(e) => resetPage(setNomination)(e.target.value)}
        >
          <option value={ALL}>Усі номінації</option>
          {nominations.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </select>
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
            .filter((key) => FEATURES.judges || key !== 'score')
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
                  <th scope="col">Назва номеру</th>
                  <th scope="col">Номінація</th>
                  <th scope="col">Вік. категорія</th>
                  <th scope="col">Ліга</th>
                  <th scope="col">Програма</th>
                  <th scope="col">К-сть уч.</th>
                  <th scope="col">Студія</th>
                  <th scope="col">Хореограф</th>
                  {FEATURES.judges && <th scope="col">Бал</th>}
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
                        (FEATURES.judges
                          ? BASE_COLUMN_COUNT
                          : BASE_COLUMN_COUNT - 1) +
                        (canManage ? ACTIONS_COLUMN_COUNT : 0)
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
                    {FEATURES.judges && (
                      <td
                        className={
                          entry.score === null
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
