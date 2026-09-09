import { useEffect, useState } from 'react';
import { getSelectableCoaches } from '../lib/auth';
import type { CoachSummary, SetMentorCoachBody } from '../lib/auth';
import styles from './MentorCoachPicker.module.css';

interface MentorCoachPickerProps {
  onChange: (value: SetMentorCoachBody | null) => void;
}

type Mode = 'pick' | 'new';

const SEARCH_DEBOUNCE_MS = 250;
const MIN_QUERY_CHARS = 2;

function coachLabel(coach: CoachSummary): string {
  const name = `${coach.lastName} ${coach.firstName}`.trim();
  return coach.schoolName ? `${name} — ${coach.schoolName}` : name;
}

// A "pick an existing coach or describe a new one" field. It reports a
// SetMentorCoachBody (or null while the choice is incomplete); the parent
// decides when to persist it.
export default function MentorCoachPicker({ onChange }: MentorCoachPickerProps) {
  const [mode, setMode] = useState<Mode>('pick');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CoachSummary[]>([]);
  const [picked, setPicked] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (mode !== 'pick' || picked || query.trim().length < MIN_QUERY_CHARS) {
      return;
    }
    const timer = setTimeout(() => {
      getSelectableCoaches(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, picked, mode]);

  const switchMode = (next: Mode) => {
    setMode(next);
    setQuery('');
    setResults([]);
    setPicked(false);
    setFirstName('');
    setLastName('');
    setPhone('');
    onChange(null);
  };

  const pickCoach = (coach: CoachSummary) => {
    setPicked(true);
    setQuery(coachLabel(coach));
    setResults([]);
    onChange({ coachId: coach.id });
  };

  const editQuery = (next: string) => {
    setQuery(next);
    if (next.trim().length < MIN_QUERY_CHARS) {
      setResults([]);
    }
    if (picked) {
      setPicked(false);
      onChange(null);
    }
  };

  const editNewCoach = (
    field: 'firstName' | 'lastName' | 'phone',
    next: string,
  ) => {
    const draft = { firstName, lastName, phone, [field]: next };
    if (field === 'firstName') setFirstName(next);
    if (field === 'lastName') setLastName(next);
    if (field === 'phone') setPhone(next);

    const trimmedFirst = draft.firstName.trim();
    const trimmedLast = draft.lastName.trim();
    const trimmedPhone = draft.phone.trim();
    onChange(
      trimmedFirst && trimmedLast && trimmedPhone
        ? {
            newCoach: {
              firstName: trimmedFirst,
              lastName: trimmedLast,
              phone: trimmedPhone,
            },
          }
        : null,
    );
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.toggle}>
        <button
          type="button"
          className={mode === 'pick' ? styles.toggleOn : styles.toggleOff}
          onClick={() => switchMode('pick')}
        >
          Обрати зі списку
        </button>
        <button
          type="button"
          className={mode === 'new' ? styles.toggleOn : styles.toggleOff}
          onClick={() => switchMode('new')}
        >
          Додати нового
        </button>
      </div>

      {mode === 'pick' ? (
        <div className={styles.combo}>
          <input
            className={styles.input}
            autoComplete="off"
            placeholder="Почніть вводити ім'я тренера…"
            value={query}
            onChange={(event) => editQuery(event.target.value)}
          />
          {query.trim().length >= MIN_QUERY_CHARS && !picked && (
            <ul className={styles.comboList}>
              {results.length === 0 ? (
                <li className={styles.comboEmpty}>Нікого не знайдено</li>
              ) : (
                results.map((coach) => (
                  <li key={coach.id}>
                    <button
                      type="button"
                      className={styles.comboItem}
                      onClick={() => pickCoach(coach)}
                    >
                      {coachLabel(coach)}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      ) : (
        <div className={styles.newForm}>
          <input
            className={styles.input}
            placeholder="Імʼя"
            value={firstName}
            onChange={(event) => editNewCoach('firstName', event.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Прізвище"
            value={lastName}
            onChange={(event) => editNewCoach('lastName', event.target.value)}
          />
          <input
            className={styles.input}
            placeholder="Телефон"
            value={phone}
            onChange={(event) => editNewCoach('phone', event.target.value)}
          />
        </div>
      )}
    </div>
  );
}
