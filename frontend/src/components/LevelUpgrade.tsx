import { useState } from 'react';
import { AuthError, upgradeLevel } from '../lib/auth';
import type { Session } from '../lib/auth';
import { ACCESS_LEVEL, ACCESS_LEVEL_LABELS, meetsLevel } from '../lib/roles';
import SchoolPicker from './SchoolPicker';
import OrganizerRequestForm from './OrganizerRequestForm';
import styles from './LevelUpgrade.module.css';

interface LevelUpgradeProps {
  session: Session;
}

type Mode = 'idle' | 'coach' | 'organizer';

export default function LevelUpgrade({ session }: LevelUpgradeProps) {
  const { accessLevel } = session.profile;
  const canBeCoach = !meetsLevel(accessLevel, ACCESS_LEVEL.COACH);
  const canRequestOrganizer = !meetsLevel(accessLevel, ACCESS_LEVEL.ORGANIZER);

  const [mode, setMode] = useState<Mode>('idle');
  const [schoolId, setSchoolId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (accessLevel === ACCESS_LEVEL.ADMIN) {
    return null;
  }

  const becomeCoach = async () => {
    if (!schoolId) {
      setError('Оберіть або створіть школу.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await upgradeLevel(ACCESS_LEVEL.COACH, schoolId);
      window.location.reload();
    } catch (err) {
      setError(
        err instanceof AuthError ? err.message : 'Не вдалося змінити рівень.',
      );
      setBusy(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.label}>Рівень доступу</div>
      <p className={styles.current}>
        Зараз: <strong>{ACCESS_LEVEL_LABELS[accessLevel]}</strong>
      </p>

      {error && <p className={styles.error}>{error}</p>}

      {mode === 'idle' && (
        <div className={styles.actions}>
          {canBeCoach && (
            <button
              type="button"
              className={styles.primary}
              onClick={() => setMode('coach')}
            >
              Стати тренером
            </button>
          )}
          {canRequestOrganizer && (
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('organizer')}
            >
              Стати організатором
            </button>
          )}
        </div>
      )}

      {mode === 'coach' && (
        <div className={styles.coachForm}>
          <SchoolPicker value={schoolId} onChange={setSchoolId} />
          <p className={styles.hint}>
            Після цього ви зможете додавати своїх учасників під час подачі
            заявки.
          </p>
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={becomeCoach}
            >
              {busy ? '…' : 'Підтвердити'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={busy}
              onClick={() => setMode('idle')}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {mode === 'organizer' && (
        <div className={styles.coachForm}>
          <OrganizerRequestForm />
          <button
            type="button"
            className={styles.ghost}
            onClick={() => setMode('idle')}
          >
            Назад
          </button>
        </div>
      )}
    </section>
  );
}
