import { useEffect, useState } from 'react';
import { getNominations } from '../../lib/nominations';
import type { Nomination } from '../../lib/nominations';
import {
  NOMINATION_LABEL,
  NOMINATION_NONE,
  NOMINATION_NOT_FOUND_LABEL,
  NOMINATION_SEARCHING_LABEL,
  NOMINATION_SEARCH_DEBOUNCE_MS,
  NOMINATION_SEARCH_MIN_CHARS,
  NOMINATION_SEARCH_PLACEHOLDER,
  PARTICIPANT_SEARCH_FAILED_MESSAGE,
} from './EntryEditModal.constants';
import styles from './EditForm.module.css';

interface EntryNominationFieldProps {
  competitionId: string;
  // The nomination the form holds now.
  currentName: string;
  onPick: (nomination: Nomination) => void;
}

// The entry's nomination plus a name search to move it to another one —
// a competition can hold thousands, so none are loaded until asked for.
export default function EntryNominationField({
  competitionId,
  currentName,
  onPick,
}: EntryNominationFieldProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Nomination[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    let cancelled = false;
    const handle = setTimeout(() => {
      if (q.length < NOMINATION_SEARCH_MIN_CHARS) {
        setResults([]);
        setSearching(false);
        setError(null);
        return;
      }
      setSearching(true);
      getNominations(competitionId, q)
        .then((found) => {
          if (cancelled) return;
          setResults(found);
          setError(null);
        })
        .catch(() => {
          if (!cancelled) setError(PARTICIPANT_SEARCH_FAILED_MESSAGE);
        })
        .finally(() => {
          if (!cancelled) setSearching(false);
        });
    }, NOMINATION_SEARCH_DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [competitionId, query]);

  const pick = (nomination: Nomination) => {
    setQuery('');
    onPick(nomination);
  };

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor="entry-nomination-search">
        {NOMINATION_LABEL}
      </label>
      <p className={styles.hint}>{currentName || NOMINATION_NONE}</p>
      <input
        id="entry-nomination-search"
        className={styles.input}
        type="text"
        autoComplete="off"
        placeholder={NOMINATION_SEARCH_PLACEHOLDER}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {searching && <p className={styles.hint}>{NOMINATION_SEARCHING_LABEL}</p>}
      {error && <p className={styles.error}>{error}</p>}
      {results.length > 0 && (
        <div className={styles.results}>
          {results.map((n) => (
            <button
              key={n.id}
              type="button"
              className={styles.result}
              onClick={() => pick(n)}
            >
              {n.name}
            </button>
          ))}
        </div>
      )}
      {!searching &&
        !error &&
        query.trim().length >= NOMINATION_SEARCH_MIN_CHARS &&
        results.length === 0 && (
          <p className={styles.hint}>{NOMINATION_NOT_FOUND_LABEL}</p>
        )}
    </div>
  );
}
