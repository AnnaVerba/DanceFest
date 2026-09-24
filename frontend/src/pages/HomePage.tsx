import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSession, getStoredAdmin } from '../lib/auth';
import {
  getCompetitionStatus,
  getCompetitions,
  getCompetitionYears,
  getMyCompetitions,
} from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { COMPETITION_STATUS } from '../lib/competitionStatus';
import type { CompetitionStatus } from '../lib/competitionStatus';
import {
  HOME_STATUS_FILTERS,
  HOME_STATUS_FILTER_ID,
  formatContestDateRange,
  groupContestsByMonth,
} from '../lib/homeContests';
import type { HomeStatusFilterId } from '../lib/homeContests';
import {
  ALL_YEARS_LABEL,
  CATALOG_SUBTITLE,
  CATALOG_TITLE,
  CREATE_COMPETITION_LABEL,
  EMPTY_LABEL,
  FIRST_PAGE,
  LOAD_ERROR,
  LOADING_LABEL,
  META_SEPARATOR,
  MY_COMPETITIONS_LABEL,
  NEXT_PAGE_LABEL,
  PAGE_LABEL,
  PAGE_OF_LABEL,
  PAGE_SIZE,
  PREV_PAGE_LABEL,
  SEARCH_DEBOUNCE_MS,
  SEARCH_PLACEHOLDER,
} from './HomePage.constants';
import CompetitionBannerPlaceholder from '../components/home/CompetitionBannerPlaceholder';
import { queryKeys } from '../lib/queryKeys';
import { PUBLIC_COMPETITIONS_STALE_TIME_MS } from '../lib/queryClient.constants';
import styles from './HomePage.module.css';
import ProjectLogo from "../components/ProjectLogo.tsx";

const STATUS_PILL_CLASS: Record<CompetitionStatus, string> = {
  [COMPETITION_STATUS.PLANNED]: styles.statusPlanned,
  [COMPETITION_STATUS.REGISTRATION_OPEN]: styles.statusOpen,
  [COMPETITION_STATUS.REGISTRATION_CLOSED]: styles.statusClosed,
  [COMPETITION_STATUS.ONGOING]: styles.statusOngoing,
  [COMPETITION_STATUS.FINISHED]: styles.statusFinished,
};

function cardMetaOf(competition: Competition): string {
  return [
    competition.location,
    formatContestDateRange(competition.dateFrom, competition.dateTo),
  ]
    .filter(Boolean)
    .join(META_SEPARATOR);
}

export default function HomePage() {
  const [page, setPage] = useState(FIRST_PAGE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [year, setYear] = useState('');
  const [statusId, setStatusId] = useState<HomeStatusFilterId>(
    HOME_STATUS_FILTER_ID.ALL,
  );
  // «Мої конкурси»: only the competitions the organizer owns or is on the
  // team of — filtered on the server, so paging and search still apply.
  const [mineOnly, setMineOnly] = useState(false);

  const canCreate = !!getStoredAdmin(); // organizer / admin
  // A logged-out visitor's top bar floats over the backdrop (PublicTopBar).
  const pageClass = getSession()
    ? styles.page
    : `${styles.page} ${styles.pageUnderHeader}`;

  // Debounce the search box so every keystroke is not a request.
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const yearsQuery = useQuery({
    queryKey: queryKeys.competitionYears(),
    queryFn: getCompetitionYears,
    staleTime: PUBLIC_COMPETITIONS_STALE_TIME_MS,
  });
  const years = yearsQuery.data ?? [];

  const competitionsFilter = {
    page,
    pageSize: PAGE_SIZE,
    q: debouncedSearch || undefined,
    year: year ? Number(year) : undefined,
    status: statusId === HOME_STATUS_FILTER_ID.ALL ? undefined : statusId,
  };
  const competitionsQuery = useQuery({
    queryKey: mineOnly
      ? queryKeys.myCompetitions(competitionsFilter)
      : queryKeys.competitions(competitionsFilter),
    queryFn: () =>
      mineOnly
        ? getMyCompetitions(competitionsFilter)
        : getCompetitions(competitionsFilter),
    staleTime: mineOnly ? undefined : PUBLIC_COMPETITIONS_STALE_TIME_MS,
  });
  const competitions = competitionsQuery.data?.rows ?? null;
  const total = competitionsQuery.data?.total ?? 0;
  const loading = competitionsQuery.isLoading;
  const error = competitionsQuery.isError ? LOAD_ERROR : null;

  const monthGroups = useMemo(() => {
    if (!competitions) return [];
    return groupContestsByMonth(competitions);
  }, [competitions]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const ready = !loading && !error && competitions !== null;

  // A filter change starts the listing over at the first page.
  const changeSearch = (v: string) => {
    setSearch(v);
    setPage(FIRST_PAGE);
  };
  const changeYear = (v: string) => {
    setYear(v);
    setPage(FIRST_PAGE);
  };
  const changeStatus = (id: HomeStatusFilterId) => {
    setStatusId(id);
    setPage(FIRST_PAGE);
  };
  const toggleMineOnly = () => {
    setMineOnly((v) => !v);
    setPage(FIRST_PAGE);
  };

  return (
    <div className={pageClass}>
      <div className={styles.container}>
        {canCreate && (
          <div className={styles.heroActions}>
            <Link to="/competitions/new" className={styles.createBtn}>
              {CREATE_COMPETITION_LABEL}
            </Link>
          </div>
        )}

        <header className={styles.hero}>
          <h1 className={styles.visuallyHiddenTitle}>{CATALOG_TITLE}</h1>
          <ProjectLogo className={styles.heroLogo} />
       <br/>
          <p className={styles.pageSubtitle}>{CATALOG_SUBTITLE}</p>
        </header>

        <div className={styles.filters}>
          <label className={styles.searchField}>
            <svg
              className={styles.searchIcon}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              className={styles.search}
              type="search"
              value={search}
              aria-label={SEARCH_PLACEHOLDER}
              onChange={(e) => changeSearch(e.target.value)}
              placeholder={SEARCH_PLACEHOLDER}
            />
          </label>
          <div className={styles.yearField}>
            <select
              className={styles.yearSelect}
              value={year}
              aria-label={ALL_YEARS_LABEL}
              onChange={(e) => changeYear(e.target.value)}
            >
              <option value="">{ALL_YEARS_LABEL}</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <svg
              className={styles.yearChevron}
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        <div className={styles.chips}>
          {HOME_STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={statusId === f.id}
              className={[
                styles.chip,
                statusId === f.id && styles.chipActive,
                f.id === HOME_STATUS_FILTER_ID.REGISTRATION_OPEN &&
                  styles.chipAccent,
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => changeStatus(f.id)}
            >
              {f.label}
            </button>
          ))}
          {canCreate && (
            <button
              type="button"
              aria-pressed={mineOnly}
              className={
                mineOnly ? `${styles.chip} ${styles.chipActive}` : styles.chip
              }
              onClick={toggleMineOnly}
            >
              {MY_COMPETITIONS_LABEL}
            </button>
          )}
        </div>

        {loading && <p className={styles.status}>{LOADING_LABEL}</p>}
        {error && <p className={styles.status}>{error}</p>}

        {ready &&
          monthGroups.map((g) => (
            <section key={g.key} className={styles.monthGroup}>
              <div className={styles.monthHead}>
                <span className={styles.monthLabel}>
                  {g.monthLabel}{' '}
                  <span className={styles.monthYear}>{g.yearLabel}</span>
                </span>
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
                          <CompetitionBannerPlaceholder competitionId={c.id} />
                        )}
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.cardHead}>
                          <span className={styles.cardTitle}>{c.name}</span>
                          <span
                            className={`${styles.statusPill} ${STATUS_PILL_CLASS[status]}`}
                          >
                            {status}
                          </span>
                        </div>
                        <span className={styles.cardMeta}>{cardMetaOf(c)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}

        {ready && monthGroups.length === 0 && (
          <div className={styles.empty}>{EMPTY_LABEL}</div>
        )}

        {ready && pageCount > 1 && (
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.chip}
              disabled={page <= FIRST_PAGE}
              onClick={() => setPage((p) => Math.max(FIRST_PAGE, p - 1))}
            >
              {PREV_PAGE_LABEL}
            </button>
            <span className={styles.pagerInfo}>
              {PAGE_LABEL} {page + 1} {PAGE_OF_LABEL} {pageCount}
            </span>
            <button
              type="button"
              className={styles.chip}
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              {NEXT_PAGE_LABEL}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
