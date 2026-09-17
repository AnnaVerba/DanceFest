import { useEffect, useState } from 'react';
import { getParticipants } from '../../lib/participants';
import {
  PARTICIPANT_SEARCH_DEBOUNCE_MS,
  PARTICIPANT_SEARCH_MIN_CHARS,
} from '../../lib/participants.constants';
import type { EntryParticipant } from '../../lib/entryEdit.types';
import { PARTICIPANT_SEARCH_FAILED_MESSAGE } from './EntryEditModal.constants';
import styles from './EditForm.module.css';

interface EntryParticipantsFieldProps {
  selected: EntryParticipant[];
  onAdd: (participant: EntryParticipant) => void;
  onRemove: (participantId: string) => void;
}

function fullName(person: EntryParticipant): string {
  return `${person.lastName} ${person.firstName}`.trim();
}

// The dancers of an entry: chips for the current lineup plus a name search
// over every participant to add more.
export default function EntryParticipantsField({
  selected,
  onAdd,
  onRemove,
}: EntryParticipantsFieldProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntryParticipant[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    const handle = setTimeout(() => {
      if (q.length < PARTICIPANT_SEARCH_MIN_CHARS) {
        setResults([]);
        setSearching(false);
        setError(null);
        return;
      }
      setSearching(true);
      getParticipants(q)
        .then((people) => {
          if (cancelled) return;
          setResults(people);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError(PARTICIPANT_SEARCH_FAILED_MESSAGE);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, PARTICIPANT_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query]);

  const selectedIds = new Set(selected.map((p) => p.id));
  const options = results.filter((p) => !selectedIds.has(p.id));

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="entry-participant-search">
        Учасники
      </label>
      {selected.length > 0 && (
        <div className={styles.chips}>
          {selected.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.chip}
              aria-label={`Прибрати ${fullName(p)}`}
              onClick={() => onRemove(p.id)}
            >
              {fullName(p)} ✕
            </button>
          ))}
        </div>
      )}
      <input
        id="entry-participant-search"
        className={styles.input}
        type="text"
        placeholder="Почніть вводити прізвище учасника…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && <p className={styles.hint}>Пошук…</p>}
      {error && <p className={styles.error}>{error}</p>}
      {options.length > 0 && (
        <div className={styles.results}>
          {options.map((p) => (
            <button
              key={p.id}
              type="button"
              className={styles.result}
              onClick={() => {
                onAdd(p);
                setQuery('');
              }}
            >
              {fullName(p)}
            </button>
          ))}
        </div>
      )}
      {!searching &&
        !error &&
        query.trim().length >= PARTICIPANT_SEARCH_MIN_CHARS &&
        options.length === 0 && (
          <p className={styles.hint}>Нікого не знайдено.</p>
        )}
    </div>
  );
}
