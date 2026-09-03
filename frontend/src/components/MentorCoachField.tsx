import { useEffect, useMemo, useState } from 'react';
import {
  getMyMentorCoach,
  getSelectableCoaches,
  setMentorCoach,
} from '../lib/auth';
import type {
  CoachSummary,
  MentorCoach,
  SetMentorCoachBody,
} from '../lib/auth';
import styles from './MentorCoachField.module.css';

type Mode = 'view' | 'pick' | 'new';

const MAX_SUGGESTIONS = 8;

function coachLabel(c: CoachSummary): string {
  const name = `${c.lastName} ${c.firstName}`.trim();
  return c.schoolName ? `${name} — ${c.schoolName}` : name;
}

export default function MentorCoachField() {
  const [mentor, setMentor] = useState<MentorCoach | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [coaches, setCoaches] = useState<CoachSummary[]>([]);
  const [mode, setMode] = useState<Mode>('view');
  const [pickId, setPickId] = useState('');
  const [query, setQuery] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMentor = () =>
    getMyMentorCoach()
      .then(setMentor)
      .catch(() => setMentor(null))
      .finally(() => setLoaded(true));

  useEffect(() => {
    loadMentor();
    getSelectableCoaches()
      .then(setCoaches)
      .catch(() => setCoaches([]));
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return coaches
      .filter((c) => coachLabel(c).toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [coaches, query]);

  const save = async (body: SetMentorCoachBody) => {
    setBusy(true);
    setError(null);
    try {
      await setMentorCoach(body);
      await loadMentor();
      setMode('view');
      setPickId('');
      setQuery('');
      setFirstName('');
      setLastName('');
      setPhone('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося зберегти.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.label}>Ваш тренер</div>

      {mode === 'view' && (
        <div className={styles.view}>
          {!loaded && <span className={styles.muted}>Завантаження…</span>}

          {loaded && !mentor && (
            <span className={styles.muted}>Не вказано</span>
          )}

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

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('pick')}
            >
              Обрати
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('new')}
            >
              Вписати нового
            </button>
          </div>
        </div>
      )}

      {mode === 'pick' && (
        <div className={styles.form}>
          <div className={styles.combo}>
            <input
              className={styles.input}
              placeholder="Почніть вводити ім'я тренера…"
              autoComplete="off"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPickId('');
              }}
            />
            {query.trim() && !pickId && (
              <ul className={styles.comboList}>
                {suggestions.length === 0 ? (
                  <li className={styles.comboEmpty}>Нікого не знайдено</li>
                ) : (
                  suggestions.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        className={styles.comboItem}
                        onClick={() => {
                          setPickId(c.id);
                          setQuery(coachLabel(c));
                        }}
                      >
                        {coachLabel(c)}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy || !pickId}
              onClick={() => save({ coachId: pickId })}
            >
              Зберегти
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => {
                setMode('view');
                setQuery('');
                setPickId('');
              }}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}

      {mode === 'new' && (
        <div className={styles.form}>
          <input
            className={styles.input}
            placeholder="Імʼя"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Прізвище"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Телефон"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={
                busy || !firstName.trim() || !lastName.trim() || !phone.trim()
              }
              onClick={() =>
                save({
                  newCoach: {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    phone: phone.trim(),
                  },
                })
              }
            >
              Зберегти
            </button>
            <button
              type="button"
              className={styles.ghost}
              onClick={() => setMode('view')}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
