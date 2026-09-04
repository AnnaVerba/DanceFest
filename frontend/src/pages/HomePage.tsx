import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStoredAdmin } from '../lib/auth';
import { getCompetitionStatus, getCompetitions } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { COMPETITION_STATUS } from '../lib/competitionStatus';
import type { CompetitionStatus } from '../lib/competitionStatus';
import {
  HOME_STATUS_FILTERS,
  HOME_STATUS_FILTER_ID,
  filterHomeContests,
  formatContestDateRange,
  groupContestsByMonth,
  listContestYears,
} from '../lib/homeContests';
import type { HomeStatusFilterId } from '../lib/homeContests';
import { mockCompetitions } from '../lib/mockCompetitions';
import styles from './HomePage.module.css';

const USE_MOCK_DATA = false;

const STATUS_PILL_CLASS: Record<CompetitionStatus, string> = {
  [COMPETITION_STATUS.PLANNED]: styles.statusPlanned,
  [COMPETITION_STATUS.REGISTRATION_OPEN]: styles.statusOpen,
  [COMPETITION_STATUS.REGISTRATION_CLOSED]: styles.statusClosed,
  [COMPETITION_STATUS.ONGOING]: styles.statusOngoing,
  [COMPETITION_STATUS.FINISHED]: styles.statusFinished,
};

export default function HomePage() {
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [year, setYear] = useState('');
  const [statusId, setStatusId] = useState<HomeStatusFilterId>(
    HOME_STATUS_FILTER_ID.ALL,
  );

  useEffect(() => {
    if (USE_MOCK_DATA) {
      setCompetitions(mockCompetitions);
      setLoading(false);
      return;
    }

    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setCompetitions(data);
      })
      .catch(() => {
        if (!cancelled)
          setError('Не вдалося завантажити конкурси. Спробуйте оновити сторінку.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const years = useMemo(
    () => (competitions ? listContestYears(competitions) : []),
    [competitions],
  );

  const monthGroups = useMemo(() => {
    if (!competitions) return [];
    return groupContestsByMonth(
      filterHomeContests(competitions, { search, year, statusId }),
    );
  }, [competitions, search, year, statusId]);

  const ready = !loading && !error && competitions !== null;
  const canCreate = !!getStoredAdmin(); // organizer / admin

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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за назвою, містом або організатором…"
          />
          <select
            className={styles.yearSelect}
            value={year}
            onChange={(e) => setYear(e.target.value)}
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
      </div>
    </div>
  );
}
