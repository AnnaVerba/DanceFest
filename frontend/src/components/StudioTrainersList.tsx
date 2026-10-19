import { useQuery } from '@tanstack/react-query';
import { getStudioTrainers } from '../lib/participants';
import { queryKeys } from '../lib/queryKeys';
import { PARTICIPANTS_STALE_TIME_MS } from '../lib/queryClient.constants';
import {
  STUDIO_TRAINER_NO_EMAIL,
  STUDIO_TRAINERS_LIST_EMPTY,
  STUDIO_TRAINERS_LIST_LOAD_ERROR,
  STUDIO_TRAINERS_LIST_TITLE,
} from './StudioTrainersList.constants';
import styles from './CoachRoster.module.css';

// A studio head's read-only list of the trainers who work in their studio.
export default function StudioTrainersList() {
  const trainersQuery = useQuery({
    queryKey: queryKeys.studioTrainers(),
    queryFn: getStudioTrainers,
    staleTime: PARTICIPANTS_STALE_TIME_MS,
  });
  const trainers = trainersQuery.data ?? null;

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.label}>{STUDIO_TRAINERS_LIST_TITLE}</div>
      </div>

      {trainersQuery.isError && (
        <p className={styles.error}>{STUDIO_TRAINERS_LIST_LOAD_ERROR}</p>
      )}

      {trainers && trainers.length === 0 && (
        <p className={styles.empty}>{STUDIO_TRAINERS_LIST_EMPTY}</p>
      )}

      {trainers && trainers.length > 0 && (
        <ul className={styles.list}>
          {trainers.map((t) => (
            <li key={t.id} className={styles.row}>
              <span className={styles.name}>
                {t.lastName} {t.firstName}
              </span>
              <span className={styles.meta}>{t.phone}</span>
              <span className={styles.meta}>
                {t.email ?? STUDIO_TRAINER_NO_EMAIL}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
