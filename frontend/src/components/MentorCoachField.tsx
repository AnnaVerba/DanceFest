import { useEffect, useState } from 'react';
import { getMyMentorCoach } from '../lib/auth';
import type { MentorCoach } from '../lib/auth';
import styles from './MentorCoachField.module.css';

// The user's mentor coach with contact details. Changing the coach
// happens in the profile edit window.
export default function MentorCoachField() {
  const [mentor, setMentor] = useState<MentorCoach | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getMyMentorCoach()
      .then(setMentor)
      .catch(() => setMentor(null))
      .finally(() => setLoaded(true));
  }, []);

  return (
    <section className={styles.card}>
      <div className={styles.label}>Ваш тренер</div>

      <div className={styles.view}>
        {!loaded && <span className={styles.muted}>Завантаження…</span>}

        {loaded && !mentor && <span className={styles.muted}>Не вказано</span>}

        {loaded && mentor && (
          <dl className={styles.details}>
            <div className={styles.row}>
              <dt>Тренер</dt>
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
                Непідтверджений — очікує реєстрації тренера за цим номером.
              </p>
            )}
          </dl>
        )}
      </div>
    </section>
  );
}
