import type { UnassignedExit, UnassignedFacets } from '../../../lib/schedule';
import { pluralExits } from '../../../lib/duration';
import styles from './Schedule.module.css';

const ALL = '';

interface UnassignedPoolProps {
  exits: UnassignedExit[];
  total: number;
  page: number;
  pageSize: number;
  facets: UnassignedFacets;
  league: string;
  ageCategory: string;
  onFilterChange: (next: { league: string; ageCategory: string }) => void;
  onPageChange: (page: number) => void;
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onSelectAll: () => void;
  onBuild: () => void;
}

export default function UnassignedPool({
  exits,
  total,
  page,
  pageSize,
  facets,
  league,
  ageCategory,
  onFilterChange,
  onPageChange,
  selectedIds,
  onSelectionChange,
  onSelectAll,
  onBuild,
}: UnassignedPoolProps) {
  const selected = new Set(selectedIds);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange([...next]);
  };

  return (
    <div className={styles.card}>
      <h3 className={styles.cardTitle}>Нерозподілені виходи</h3>

      <div className={styles.filters}>
        <select
          className={styles.select}
          value={ageCategory}
          onChange={(e) =>
            onFilterChange({ league, ageCategory: e.target.value })
          }
          aria-label="Вікова категорія"
        >
          <option value={ALL}>Усі вікові</option>
          {facets.ageCategories.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          className={styles.select}
          value={league}
          onChange={(e) =>
            onFilterChange({ league: e.target.value, ageCategory })
          }
          aria-label="Ліга"
        >
          <option value={ALL}>Усі ліги</option>
          {facets.leagues.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>

      <p className={styles.counter}>
        Нерозподілено: {total} {pluralExits(total)} · обрано:{' '}
        {selectedIds.length}
      </p>

      <div className={styles.poolActions}>
        <button type="button" className={styles.btn} onClick={onSelectAll}>
          Обрати все
        </button>
        <button
          type="button"
          className={styles.btn}
          onClick={() => onSelectionChange([])}
        >
          Зняти вибір
        </button>
        <button
          type="button"
          className={styles.btnPrimary}
          disabled={selectedIds.length === 0}
          onClick={onBuild}
        >
          Сформувати відділення
        </button>
      </div>

      {total === 0 ? (
        <p className={styles.empty}>Усі виходи розподілені по відділеннях.</p>
      ) : (
        <>
          <ul className={styles.poolList}>
            {exits.map((exit) => (
              <li key={exit.id} className={styles.poolItem}>
                <input
                  type="checkbox"
                  checked={selected.has(exit.id)}
                  onChange={() => toggle(exit.id)}
                  aria-label={`Вихід №${exit.number}`}
                />
                <span className={styles.poolNum}>№{exit.number}</span>
                <span>
                  {exit.nomination} — {exit.routineName}
                  {exit.improv ? ' · імпро' : ''}
                </span>
              </li>
            ))}
          </ul>

          {pageCount > 1 && (
            <div className={styles.poolActions}>
              <button
                type="button"
                className={styles.btn}
                disabled={page <= 0}
                onClick={() => onPageChange(page - 1)}
              >
                ‹
              </button>
              <span className={styles.counter}>
                {page + 1} / {pageCount}
              </span>
              <button
                type="button"
                className={styles.btn}
                disabled={page >= pageCount - 1}
                onClick={() => onPageChange(page + 1)}
              >
                ›
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
