import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import PublicTopBar from '../components/PublicTopBar';
import { getSession, getToken } from '../lib/auth';
import type { ParticipantProfile } from '../lib/auth';
import { getCompetitionStatus, getCompetitions } from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import { COMPETITION_STATUS } from '../lib/competitionStatus';
import { ROLE, ROLE_CABINET_PATH } from '../lib/roles';
import styles from './ParticipantCabinetPage.module.css';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function ParticipantCabinetPage() {
  const session = getSession();

  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setCompetitions(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити конкурси.');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openCompetitions = useMemo(
    () =>
      (competitions ?? []).filter(
        (c) => getCompetitionStatus(c) === COMPETITION_STATUS.REGISTRATION_OPEN,
      ),
    [competitions],
  );

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== ROLE.PARTICIPANT) {
    return <Navigate to={ROLE_CABINET_PATH[session.role]} replace />;
  }

  const profile = session.profile as ParticipantProfile;

  return (
    <>
      <PublicTopBar />
      <main className={styles.main}>
        <div className={styles.container}>
          <p className={styles.eyebrow}>Кабінет учасника</p>
          <h1 className={styles.title}>
            {profile.firstName} {profile.lastName}
          </h1>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Відкриті конкурси</h2>
            {loadError && <p className={styles.status}>{loadError}</p>}
            {!loadError && competitions === null && (
              <p className={styles.status}>Завантаження...</p>
            )}
            {!loadError && competitions !== null && openCompetitions.length === 0 && (
              <p className={styles.status}>Зараз немає конкурсів з відкритою реєстрацією.</p>
            )}
            <ul className={styles.list}>
              {openCompetitions.map((c) => (
                <li key={c.id} className={styles.card}>
                  <div>
                    <div className={styles.cardName}>{c.name}</div>
                    <div className={styles.cardMeta}>
                      {formatDate(c.dateFrom)}
                      {c.location && ` · ${c.location}`}
                    </div>
                  </div>
                  <Link to={`/competitions/${c.id}/apply`} className={styles.applyBtn}>
                    Подати заявку
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </>
  );
}
