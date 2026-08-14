import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { deleteEntry, getEntries } from '../../lib/entries';
import type { Entry } from '../../lib/entries';
import styles from './EntriesPanel.module.css';

interface EntriesPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

const ALL = '__all__';
const PAGE_SIZE = 20;

type SortKey = 'number' | 'name' | 'score';

const SORT_LABELS: Record<SortKey, string> = {
  number: 'Сортувати за №',
  name: 'За назвою',
  score: 'За балом',
};

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
  const [entries, setEntries] = useState<Entry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);

  const [search, setSearch] = useState('');
  const [nomination, setNomination] = useState(ALL);
  const [ageCategory, setAgeCategory] = useState(ALL);
  const [league, setLeague] = useState(ALL);
  const [program, setProgram] = useState(ALL);
  const [sort, setSort] = useState<SortKey>('number');
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    getEntries(competitionId)
      .then((data) => {
        if (!cancelled) setEntries(data);
      })
      .catch(() => {
        if (!cancelled) onError('Не вдалося завантажити заявки.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const handleDelete = async (entry: Entry) => {
    try {
      await deleteEntry(competitionId, entry.id);
      setEntries((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev);
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
      <div className={styles.intro}>
        <p className={styles.note}>
          Заявки подають самі учасники через форму реєстрації на конкурс — тут ви
          лише переглядаєте подані заявки.
        </p>
        <a
          className={styles.btn}
          href={`/competitions/${competitionId}/apply`}
          target="_blank"
          rel="noopener"
        >
          Форма подачі заявки ↗
        </a>
      </div>

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
          {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
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
                  <th scope="col">Назва номеру</th>
                  <th scope="col">Номінація</th>
                  <th scope="col">Вік. категорія</th>
                  <th scope="col">Ліга</th>
                  <th scope="col">Програма</th>
                  <th scope="col">К-сть уч.</th>
                  <th scope="col">Студія</th>
                  <th scope="col">Хореограф</th>
                  <th scope="col">Бал</th>
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
                    <td colSpan={canManage ? 11 : 10} className={styles.noMatches}>
                      Нічого не знайдено за обраними фільтрами.
                    </td>
                  </tr>
                )}
                {pageEntries.map((entry) => (
                  <tr key={entry.id}>
                    <td className={styles.num}>{entry.number}</td>
                    <td className={styles.name}>{entry.routineName}</td>
                    <td>{entry.nomination}</td>
                    <td>{entry.ageCategory}</td>
                    <td>{entry.league}</td>
                    <td>{entry.program}</td>
                    <td>{entry.participantsCount ?? ''}</td>
                    <td>{entry.studioName}</td>
                    <td>{entry.choreographer}</td>
                    <td
                      className={
                        entry.score === null
                          ? `${styles.score} ${styles.scoreEmpty}`
                          : styles.score
                      }
                    >
                      {formatScore(entry.score)}
                    </td>
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
