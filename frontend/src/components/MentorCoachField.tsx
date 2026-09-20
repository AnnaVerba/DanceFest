import { useEffect, useState } from 'react';
import { getMyMentorCoach } from '../lib/auth';
import type { MentorCoach } from '../lib/auth';
import {
  MENTOR_COACH_LOAD_FAILED_MESSAGE,
  MENTOR_COACH_RETRY_LABEL,
} from './MentorCoachField.constants';
import styles from './MentorCoachField.module.css';

// The user's mentor coach with contact details. Changing the coach
// happens in the profile edit window.
export default function MentorCoachField() {
  const [mentor, setMentor] = useState<MentorCoach | null>(null);
  const [loaded, setLoaded] = useState(false);
  // A failed request is not the same as "no coach": keep them apart.
  const [loadFailed, setLoadFailed] = useState(false);

  const fetchMentor = () => {
    getMyMentorCoach()
      .then((coach) => {
        setMentor(coach);
        setLoadFailed(false);
      })
      .catch(() => setLoadFailed(true))
      .finally(() => setLoaded(true));
  };

  useEffect(fetchMentor, []);

  const retry = () => {
    setLoaded(false);
    fetchMentor();
  };

  return (
    <section className={styles.card}>
      <div className={styles.label}>Ваш керівник</div>

      <div className={styles.view}>
        {!loaded && <span className={styles.muted}>Завантаження…</span>}

        {loaded && loadFailed && (
          <div role="alert" className={styles.loadError}>
            <span>{MENTOR_COACH_LOAD_FAILED_MESSAGE}</span>
            <button
              type="button"
              className={styles.retry}
              onClick={retry}
            >
              {MENTOR_COACH_RETRY_LABEL}
            </button>
          </div>
        )}

        {loaded && !loadFailed && !mentor && (
          <span className={styles.muted}>Не вказано</span>
        )}

        {loaded && !loadFailed && mentor && (
          <dl className={styles.details}>
            <div className={styles.row}>
              <dt>Керівник</dt>
              <dd>
                {mentor.lastName} {mentor.firstName}
              </dd>
            </div>
            <div className={styles.row}>
              <dt>Телефон</dt>
              <dd>{mentor.phone}</dd>
            </div>
            <div className={styles.row}>
              <dt>Школа / студія</dt>
              <dd>{mentor.schoolName ?? '—'}</dd>
            </div>
            {!mentor.confirmed && (
              <p className={styles.pending}>
                Непідтверджений — очікує реєстрації керівника за цим номером.
              </p>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}
