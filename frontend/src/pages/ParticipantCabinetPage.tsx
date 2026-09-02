import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { getStoredAdmin, getToken } from '../lib/auth';
import { getCompetitionStatus, getCompetitions } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { COMPETITION_STATUS } from '../lib/competitionStatus';
import { formatContestDateRange } from '../lib/homeContests';
import styles from './ParticipantCabinetPage.module.css';

export default function ParticipantCabinetPage() {
  const admin = getStoredAdmin();
  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setCompetitions(data);
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити конкурси.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  const openContests = (competitions ?? []).filter(
    (c) => getCompetitionStatus(c) === COMPETITION_STATUS.REGISTRATION_OPEN,
  );

  return (
    <div className={styles.page}>
      <AdminHeader />
      <main className={styles.main}>
        <div className={styles.wrap}>
          <h1 className={styles.title}>Мої заявки</h1>
          {admin && <p className={styles.subtitle}>{admin.name}</p>}

          <section className={styles.card}>
            <div className={styles.cardLabel}>Відкриті конкурси</div>
            {loading && <p className={styles.note}>Завантаження...</p>}
            {error && <p className={styles.note}>{error}</p>}
            {!loading && !error && openContests.length === 0 && (
              <p className={styles.note}>Наразі немає відкритих конкурсів.</p>
            )}
            {openContests.length > 0 && (
              <div className={styles.openList}>
                {openContests.map((c) => (
                  <div key={c.id} className={styles.openRow}>
                    <div className={styles.openInfo}>
                      <div className={styles.openName}>{c.name}</div>
                      <div className={styles.openMeta}>
                        {formatContestDateRange(c.dateFrom, c.dateTo)}
                        {c.location && ` · ${c.location}`}
                      </div>
                    </div>
                    <Link
                      to={`/competitions/${c.id}/apply`}
                      className={styles.applyButton}
                    >
                      Подати заявку
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className={styles.tableCard}>
            <div className={styles.tableHead}>Мої заявки та результати</div>
            <p className={styles.empty}>Ви ще не подавали заявок.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
