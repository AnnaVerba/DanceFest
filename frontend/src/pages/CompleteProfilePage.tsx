import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import SchoolPicker from '../components/SchoolPicker';
import MentorCoachPicker from '../components/MentorCoachPicker';
import { getSession } from '../lib/auth';
import type { SetMentorCoachBody } from '../lib/auth';
import { completeProfile } from '../lib/users';
import { needsProfileCompletion } from '../lib/profileCompletion';
import { ACCESS_LEVEL } from '../lib/roles';
import styles from './CompleteProfilePage.module.css';

const SAVE_FAILED_MESSAGE = 'Не вдалося зберегти профіль. Спробуйте ще раз.';

export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const session = getSession();
  const [schoolId, setSchoolId] = useState(session?.profile.schoolId ?? '');
  const [mentor, setMentor] = useState<SetMentorCoachBody | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!session) {
    return <Navigate to="/login" replace />;
  }
  if (!needsProfileCompletion(session.profile)) {
    return <Navigate to="/profile" replace />;
  }

  const isCoach = session.profile.accessLevel === ACCESS_LEVEL.COACH;
  const canSubmit = mentor !== null && (!isCoach || schoolId.trim() !== '');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !mentor) return;
    setSubmitting(true);
    setError(null);
    try {
      await completeProfile(isCoach ? { ...mentor, schoolId } : mentor);
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
          {isCoach
            ? 'Вкажіть школу, у якій ви працюєте, і свого тренера — без цього продовжити не можна.'
            : 'Оберіть або додайте свого тренера — без цього продовжити не можна.'}
        </p>

        {isCoach && (
          <div className={styles.field}>
            <SchoolPicker value={schoolId} onChange={setSchoolId} />
          </div>
        )}

        <div className={styles.field}>
          <span className={styles.label}>Ваш тренер</span>
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
      </form>
    </main>
  );
}
