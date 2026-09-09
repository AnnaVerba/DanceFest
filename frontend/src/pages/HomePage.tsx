import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredAdmin } from '../lib/auth';
import {
  getCompetitionStatus,
  getCompetitions,
  getCompetitionYears,
} from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { COMPETITION_STATUS } from '../lib/competitionStatus';
import type { CompetitionStatus } from '../lib/competitionStatus';
import {
  HOME_STATUS_FILTERS,
  HOME_STATUS_FILTER_ID,
  filterHomeContests,
  formatContestDateRange,
  groupContestsByMonth,
} from '../lib/homeContests';
import type { HomeStatusFilterId } from '../lib/homeContests';
import { mockCompetitions } from '../lib/mockCompetitions';
import styles from './HomePage.module.css';

const USE_MOCK_DATA = false;
const PAGE_SIZE = 24;

const STATUS_PILL_CLASS: Record<CompetitionStatus, string> = {
  [COMPETITION_STATUS.PLANNED]: styles.statusPlanned,
  [COMPETITION_STATUS.REGISTRATION_OPEN]: styles.statusOpen,
  [COMPETITION_STATUS.REGISTRATION_CLOSED]: styles.statusClosed,
  [COMPETITION_STATUS.ONGOING]: styles.statusOngoing,
  [COMPETITION_STATUS.FINISHED]: styles.statusFinished,
};

export default function HomePage() {
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [years, setYears] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [year, setYear] = useState('');
  const [statusId, setStatusId] = useState<HomeStatusFilterId>(
    HOME_STATUS_FILTER_ID.ALL,
  );

  // Debounce the search box so every keystroke is not a request.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  useEffect(() => {
    if (USE_MOCK_DATA) return;
    getCompetitionYears()
      .then(setYears)
      .catch(() => setYears([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (USE_MOCK_DATA) {
        setCompetitions(mockCompetitions);
        setTotal(mockCompetitions.length);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getCompetitions({
          page,
          pageSize: PAGE_SIZE,
          q: debouncedSearch || undefined,
          year: year ? Number(year) : undefined,
        });
        if (cancelled) return;
        setCompetitions(data.rows);
        setTotal(data.total);
      } catch {
        if (!cancelled)
          setError(
            'Не вдалося завантажити конкурси. Спробуйте оновити сторінку.',
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch, year]);

  const monthGroups = useMemo(() => {
    if (!competitions) return [];
    return groupContestsByMonth(filterHomeContests(competitions, statusId));
  }, [competitions, statusId]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ready = !loading && !error && competitions !== null;
  const canCreate = !!getStoredAdmin(); // organizer / admin

  // A filter change starts the listing over at the first page.
  const changeSearch = (v: string) => {
    setSearch(v);
    setPage(0);
  };
  const changeYear = (v: string) => {
    setYear(v);
    setPage(0);
  };

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.pageHead}>
          <div>
            <h1 className={styles.pageTitle}>Конкурси східного танцю</h1>
            <p className={styles.pageSubtitle}>
              Оберіть конкурс — заявка подається з кабінету тренера або
              учасника.
            </p>
          </div>
          {canCreate && (
            <Link to="/competitions/new" className={styles.createBtn}>
              + Створити конкурс
            </Link>
          )}
        </div>

        <div className={styles.filters}>
          <input
            className={styles.search}
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
            placeholder="Пошук за назвою, містом або організатором…"
          />
          <select
            className={styles.yearSelect}
            value={year}
            onChange={(e) => changeYear(e.target.value)}
          >
            <option value="">Усі роки</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.chips}>
          {HOME_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={
                statusId === f.id ? `${styles.chip} ${styles.chipActive}` : styles.chip
              }
              onClick={() => setStatusId(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && <p className={styles.status}>Завантаження...</p>}
        {error && <p className={styles.status}>{error}</p>}

        {ready &&
          monthGroups.map((g) => (
            <section key={g.key} className={styles.monthGroup}>
              <div className={styles.monthHead}>
                <span className={styles.monthLabel}>{g.label}</span>
                <span className={styles.monthRule} />
                <span className={styles.monthCount}>{g.countLabel}</span>
              </div>
              <div className={styles.grid}>
                {g.competitions.map((c) => {
                  const status = getCompetitionStatus(c);
                  return (
                    <Link
                      key={c.id}
                      to={`/competitions/${c.id}`}
                      className={styles.card}
                    >
                      <div className={styles.cardBanner}>
                        {c.image ? (
                          <img src={c.image} alt="" />
                        ) : (
                          <span>Банер конкурсу</span>
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <span
                          className={`${styles.statusPill} ${STATUS_PILL_CLASS[status]}`}
                        >
                          {status}
                        </span>
                        <span className={styles.cardTitle}>{c.name}</span>
                        <span className={styles.cardMeta}>
                          {formatContestDateRange(c.dateFrom, c.dateTo)}
                          {c.location && ` · ${c.location}`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

        {ready && monthGroups.length === 0 && (
          <div className={styles.empty}>За цими умовами конкурсів не знайдено.</div>
        )}

        {ready && pageCount > 1 && (
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.chip}
              disabled={page <= 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              ‹ Попередні
            </button>
            <span className={styles.pagerInfo}>
              Сторінка {page + 1} з {pageCount}
            </span>
            <button
              type="button"
              className={styles.chip}
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              Наступні ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
