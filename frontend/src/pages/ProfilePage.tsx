import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import LevelUpgrade from '../components/LevelUpgrade';
import MentorCoachField from '../components/MentorCoachField';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL, ACCESS_LEVEL_LABELS, meetsLevel } from '../lib/roles';
import { getMyProfile } from '../lib/users';
import type { MyProfile } from '../lib/users';
import { formatContestDate } from '../lib/homeContests';
import styles from './ProfilePage.module.css';

function formatBirthDate(iso: string | null): string {
  if (!iso) return '—';
  return formatContestDate(iso);
}

export default function ProfilePage() {
  const session = getSession();
  const [profile, setProfile] = useState<MyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMyProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setError('Не вдалося завантажити профіль.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }

  const rows: Array<{ label: string; value: string }> = profile
    ? [
        { label: 'Імʼя', value: profile.firstName },
        { label: 'Прізвище', value: profile.lastName },
        { label: 'Роль', value: ACCESS_LEVEL_LABELS[profile.accessLevel] },
        { label: 'Дата народження', value: formatBirthDate(profile.birthDate) },
        { label: 'Телефон', value: profile.phone },
        { label: 'Email', value: profile.email ?? '—' },
        { label: 'Школа / студія', value: profile.schoolName ?? '—' },
      ]
    : [];

  return (
    <CabinetLayout>
      <h1 className={styles.title}>Профіль</h1>

      {loading && <p className={styles.note}>Завантаження...</p>}
      {error && <p className={styles.note}>{error}</p>}

      {profile && (
        <>
          <section className={styles.card}>
            <dl className={styles.list}>
              {rows.map((row) => (
                <div key={row.label} className={styles.row}>
                  <dt className={styles.rowLabel}>{row.label}</dt>
                  <dd className={styles.rowValue}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <LevelUpgrade session={session} />

          {meetsLevel(profile.accessLevel, ACCESS_LEVEL.COACH) && (
            <MentorCoachField />
          )}
        </>
      )}
    </CabinetLayout>
  );
}
