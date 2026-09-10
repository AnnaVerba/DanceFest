import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import CompetitionDetails from '../components/CompetitionDetails';
import ContestIcon from '../components/ContestIcon';
import PublicEntriesList from '../components/PublicEntriesList';
import PublicProgramList from '../components/PublicProgramList';
import { getApplyEligibility, getCompetition } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { getEntriesCount } from '../lib/entries';
import { getVenues } from '../lib/venues';
import type { Venue } from '../lib/venues';
import styles from './PublicCompetitionPage.module.css';

const TABS = ['Деталі', 'Програма', 'Заявки'] as const;
type Tab = (typeof TABS)[number];

export default function PublicCompetitionPage() {
  const { id } = useParams<{ id: string }>();

  const [competition, setCompetition] = useState<Competition | null>(null);
  const [entriesCount, setEntriesCount] = useState<number | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('Деталі');

  useEffect(() => {
    if (!id) return;

    let cancelled = false;
    getCompetition(id)
      .then((data) => {
        if (!cancelled) setCompetition(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити конкурс.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    getEntriesCount(id)
      .then((count) => {
        if (!cancelled) setEntriesCount(count);
      })
      .catch(() => {
        /* count is optional — leave it hidden on failure */
      });

    getVenues(id)
      .then((data) => {
        if (!cancelled) setVenues(data);
      })
      .catch(() => {
        /* venues are optional — leave the section hidden on failure */
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

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
              {(() => {
                // A public visitor is never an organizer of this competition.
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

              <div
                className={styles.tabs}
                role="tablist"
                aria-label="Розділи конкурсу"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={styles.tab}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {activeTab === 'Деталі' && (
                <>
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
                            <span className={styles.venueName}>
                              {venue.name}
                            </span>
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
                </>
              )}

              {activeTab === 'Програма' && (
                <PublicProgramList competitionId={id} />
              )}

              {activeTab === 'Заявки' && (
                <PublicEntriesList competitionId={id} />
              )}
            </article>
          )}
        </div>
      </main>
    </div>
  );
}
