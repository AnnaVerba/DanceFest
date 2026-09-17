import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import CompetitionDetails from '../components/CompetitionDetails';
import ContestIcon from '../components/ContestIcon';
import { getApplyEligibility, getCompetition } from '../lib/competitions';
import { getEntriesCount } from '../lib/entries';
import { getVenues } from '../lib/venues';
import { queryKeys } from '../lib/queryKeys';
import styles from './PublicCompetitionPage.module.css';

export default function PublicCompetitionPage() {
  const { id } = useParams<{ id: string }>();

  const competitionQuery = useQuery({
    queryKey: queryKeys.competition(id ?? ''),
    queryFn: () => getCompetition(id!),
    enabled: !!id,
  });
  const competition = competitionQuery.data ?? null;
  const loading = competitionQuery.isLoading;
  const loadError = competitionQuery.isError
    ? 'Не вдалося завантажити конкурс.'
    : null;

  // Count and venues are optional embellishments — their own failure stays
  // silent, the card still renders without them.
  const entriesCountQuery = useQuery({
    queryKey: queryKeys.entriesCount(id ?? ''),
    queryFn: () => getEntriesCount(id!),
    enabled: !!id,
    retry: false,
  });
  const entriesCount = entriesCountQuery.data ?? null;

  const venuesQuery = useQuery({
    queryKey: queryKeys.venues(id ?? ''),
    queryFn: () => getVenues(id!),
    enabled: !!id,
    retry: false,
  });
  const venues = venuesQuery.data ?? [];

  if (!id) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.wrap}>
          <Link to="/" className={styles.back}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            До всіх конкурсів
          </Link>

          {loading && <p className={styles.status}>Завантаження...</p>}
          {loadError && <p className={styles.status}>{loadError}</p>}

          {!loading && !loadError && competition && (
            <article className={styles.card}>
              {/* A public visitor is never an organizer of this competition. */}
              {(() => {
                const apply = getApplyEligibility(competition, {
                  isOrganizer: false,
                });
                return (
                  <>
                    <div className={styles.contestHead}>
                      <span
                        className={styles.contestHeadIcon}
                        aria-hidden="true"
                      >
                        <ContestIcon />
                      </span>
                      <h1>{competition.name}</h1>
                      <Link
                        to={`/competitions/${id}/schedule`}
                        className={styles.programLink}
                      >
                        Програма фестивалю
                      </Link>
                      <Link
                        to={`/competitions/${id}/entries`}
                        className={styles.programLink}
                      >
                        Заявки
                      </Link>
                      {apply.allowed ? (
                        <Link
                          to={`/competitions/${id}/apply`}
                          className={styles.applyButton}
                        >
                          Подати заявку
                        </Link>
                      ) : (
                        <span
                          className={`${styles.applyButton} ${styles.applyDisabled}`}
                          aria-disabled="true"
                          title={apply.reason ?? ''}
                        >
                          Подати заявку
                        </span>
                      )}
                    </div>
                    {!apply.allowed && (
                      <p className={styles.applyNote}>{apply.reason}</p>
                    )}
                  </>
                );
              })()}

              <CompetitionDetails
                competition={competition}
                entriesCount={entriesCount}
              />

              {venues.length > 0 && (
                <section className={styles.venues}>
                  <h2 className={styles.venuesHeading}>Майданчики</h2>
                  <ul className={styles.venueList}>
                    {venues.map((venue) => (
                      <li key={venue.id} className={styles.venueItem}>
                        <span className={styles.venueName}>{venue.name}</span>
                        {venue.description && (
                          <span className={styles.venueDesc}>
                            {venue.description}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
