import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import LevelUpgrade from '../components/LevelUpgrade';
import MentorCoachField from '../components/MentorCoachField';
import { getSession, getToken } from '../lib/auth';
import { ACCESS_LEVEL_LABELS, canHaveMentorCoach } from '../lib/roles';
import { getMyProfile } from '../lib/users';
import { formatContestDate } from '../lib/homeContests';
import { queryKeys } from '../lib/queryKeys';
import { ME_STALE_TIME_MS } from '../lib/queryClient.constants';
import styles from './ProfilePage.module.css';

function formatBirthDate(iso: string | null): string {
  if (!iso) return '—';
  return formatContestDate(iso);
}

export default function ProfilePage() {
  const session = getSession();

  // Never served from a stale cache: the profile is who-am-I data, and a
  // change (role upgrade, mentor coach) must show up the moment it happens.
  // No retry: authorizedFetch already refreshes the token and retries once
  // on a 401, so a query-level retry would only re-trigger that same cycle.
  const profileQuery = useQuery({
    queryKey: queryKeys.me(),
    queryFn: getMyProfile,
    enabled: !!getToken() && !!session,
    staleTime: ME_STALE_TIME_MS,
    retry: false,
  });
  const profile = profileQuery.data ?? null;
  const loading = profileQuery.isLoading;
  const error = profileQuery.isError ? 'Не вдалося завантажити профіль.' : null;

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

          {canHaveMentorCoach(profile.accessLevel) && <MentorCoachField />}
        </>
      )}
    </CabinetLayout>
  );
}
