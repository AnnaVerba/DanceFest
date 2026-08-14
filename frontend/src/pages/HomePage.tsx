import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCompetitionStatus, getCompetitions } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { mockCompetitions } from '../lib/mockCompetitions';
import styles from './HomePage.module.css';

// Бекенд знову піднятий — моки вимкнені. Поставити true, якщо бекенд ляже знову.
const USE_MOCK_DATA = false;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateRange(dateFrom: string, dateTo: string): string {
  return dateFrom === dateTo
    ? `${formatDate(dateFrom)} р.`
    : `${formatDate(dateFrom)} – ${formatDate(dateTo)} р.`;
}

export default function HomePage() {
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
        if (!cancelled) setError('Не вдалося завантажити конкурси. Спробуйте оновити сторінку.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.main}>
      <div className={styles.container}>
        <h1 className={styles.pageTitle}>Танцювальні конкурси</h1>
        <p className={styles.pageSubtitle}>
          Оберіть конкурс і подайте заявку на участь — реєстрація не потрібна.
        </p>

        {loading && <p className={styles.status}>Завантаження...</p>}
        {error && <p className={styles.status}>{error}</p>}
        {!loading && !error && competitions?.length === 0 && (
          <p className={styles.status}>Поки що немає запланованих конкурсів</p>
        )}

        {!loading && !error && competitions && competitions.length > 0 && (
          <ul className={styles.contests}>
            {competitions.map((c) => (
              <li key={c.id}>
                <Link to={`/competitions/${c.id}`} className={styles.card}>
                  <div className={styles.cardBanner}>
                    {c.image ? (
                      <img src={c.image} alt="" />
                    ) : (
                      <>
                        <svg
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.8" cy="8.8" r="1.6" />
                          <path d="M21 15.5l-5-5L5 21" />
                        </svg>
                        <span>Банер конкурсу</span>
                      </>
                    )}
                  </div>
                  <div className={styles.cardBody}>
                    <span className={styles.badge}>{getCompetitionStatus(c)}</span>
                    <h2 className={styles.cardTitle}>{c.name}</h2>
                    <p className={styles.cardMeta}>
                      {formatDateRange(c.dateFrom, c.dateTo)}
                      {c.location && ` · ${c.location}`}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
