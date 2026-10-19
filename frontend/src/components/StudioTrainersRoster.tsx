import { useQuery } from '@tanstack/react-query';
import { getStudioTrainersDancers } from '../lib/participants';
import { queryKeys } from '../lib/queryKeys';
import { PARTICIPANTS_STALE_TIME_MS } from '../lib/queryClient.constants';
import { formatBirthDate } from '../lib/birthDate';
import { groupDancersByTrainer } from '../lib/studioDancerGroups';
import {
  CLAIMED_STATUS_LABEL,
  STUDIO_TRAINER_UNKNOWN,
  STUDIO_TRAINERS_ROSTER_EMPTY,
  STUDIO_TRAINERS_ROSTER_LOAD_ERROR,
  STUDIO_TRAINERS_ROSTER_TITLE,
  TRAINER_GROUP_TITLE_PREFIX,
  UNCLAIMED_STATUS_LABEL,
} from './StudioTrainersRoster.constants';
import styles from './CoachRoster.module.css';

// A studio head's read-only list of the dancers their studio's trainers
// train, one card per trainer — the trainers add and remove them, the head
// only looks.
export default function StudioTrainersRoster() {
  const dancersQuery = useQuery({
    queryKey: queryKeys.studioTrainersDancers(),
    queryFn: getStudioTrainersDancers,
    staleTime: PARTICIPANTS_STALE_TIME_MS,
  });
  const dancers = dancersQuery.data ?? null;

  if (!dancers || dancers.length === 0) {
    return (
      <section className={styles.card}>
        <div className={styles.head}>
          <div className={styles.label}>{STUDIO_TRAINERS_ROSTER_TITLE}</div>
        </div>
        {dancersQuery.isError && (
          <p className={styles.error}>{STUDIO_TRAINERS_ROSTER_LOAD_ERROR}</p>
        )}
        {dancers && (
          <p className={styles.empty}>{STUDIO_TRAINERS_ROSTER_EMPTY}</p>
        )}
      </section>
    );
  }

  return (
    <>
      {groupDancersByTrainer(dancers).map((group) => (
        <section key={group.trainerId} className={styles.card}>
          <div className={styles.head}>
            <div className={styles.label}>
              {TRAINER_GROUP_TITLE_PREFIX}{' '}
              {group.trainerName ?? STUDIO_TRAINER_UNKNOWN}
            </div>
          </div>
          <ul className={styles.list}>
            {group.dancers.map((d) => (
              <li key={d.id} className={styles.row}>
                <span className={styles.name}>
                  {d.lastName} {d.firstName}
                </span>
                <span className={styles.meta}>{d.phone}</span>
                <span className={styles.meta}>
                  {formatBirthDate(d.birthDate)}
                </span>
                <span
                  className={d.hasPassword ? styles.claimed : styles.unclaimed}
                >
                  {d.hasPassword ? CLAIMED_STATUS_LABEL : UNCLAIMED_STATUS_LABEL}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}
