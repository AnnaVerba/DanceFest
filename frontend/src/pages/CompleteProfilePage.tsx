import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import MentorCoachPicker from '../components/MentorCoachPicker';
import { getSession } from '../lib/auth';
import type { SetMentorCoachBody } from '../lib/auth';
import { completeProfile } from '../lib/users';
import {
  needsProfileCompletion,
  skipProfileCompletionForSession,
} from '../lib/profileCompletion';
import styles from './CompleteProfilePage.module.css';

const SAVE_FAILED_MESSAGE = 'Не вдалося зберегти профіль. Спробуйте ще раз.';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const session = getSession();
  const [mentor, setMentor] = useState<SetMentorCoachBody | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (!needsProfileCompletion(session.profile)) {
    return <Navigate to="/profile" replace />;
  }

  const canSubmit = mentor !== null;

  const handleSkip = () => {
    skipProfileCompletionForSession();
    navigate('/');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !mentor) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeProfile(mentor);
      navigate('/profile');
    } catch (err) {
      setError(err instanceof Error ? err.message : SAVE_FAILED_MESSAGE);
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Завершіть профіль</h1>
        <p className={styles.subtitle}>
          Оберіть або додайте свого керівника. Можна пропустити й заповнити
          пізніше у профілі.
        </p>

        <div className={styles.field}>
          <span className={styles.label}>Ваш керівник</span>
          <MentorCoachPicker onChange={setMentor} />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.submit}
          disabled={submitting || !canSubmit}
        >
          {submitting ? 'Збереження…' : 'Зберегти та продовжити'}
        </button>

        <button type="button" className={styles.skip} onClick={handleSkip}>
          Пропустити поки що
        </button>
      </form>
    </main>
  );
}
