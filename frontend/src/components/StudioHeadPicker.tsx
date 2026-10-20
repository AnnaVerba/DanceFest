import { useEffect, useState } from 'react';
import { searchSchoolHeads } from '../lib/schools';
import {
  SCHOOL_HEADS_LOAD_FAILED_MESSAGE,
  SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS,
} from '../lib/schools.constants';
import type { SchoolHead } from '../lib/schoolHead.types';
import {
  STUDIO_HEAD_CHANGE_LABEL,
  STUDIO_HEAD_LABEL,
  STUDIO_HEAD_NOT_FOUND_LABEL,
  STUDIO_HEAD_PLACEHOLDER,
  STUDIO_HEAD_SEARCHING_LABEL,
  STUDIO_HEAD_SEARCH_DEBOUNCE_MS,
  STUDIO_HEAD_TOO_SHORT_HINT,
} from './StudioHeadPicker.constants';
import styles from './SchoolPicker.module.css';

interface StudioHeadPickerProps {
  value: SchoolHead | null;
  onChange: (head: SchoolHead | null) => void;
}

function headLabel(head: SchoolHead): string {
  return `${head.lastName} ${head.firstName} — ${head.schoolName}`;
}

// Typeahead over studio heads by name: pick one and the parent learns their
// studio. Looks and behaves like the school picker next to it.
export default function StudioHeadPicker({
  value,
  onChange,
}: StudioHeadPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SchoolHead[]>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (value) return;
    const trimmed = query.trim();
    if (trimmed.length < SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS) {
      setResults([]);
      setSearching(false);
      return;
    }

    let active = true;
    // Drop the previous query's matches at once, so a stale list never shows
    // under the new query.
    setResults([]);
    setError(null);
    setSearching(true);
    const t = setTimeout(() => {
      searchSchoolHeads(trimmed)
        .then((found) => {
          if (active) setResults(found);
        })
        .catch(() => {
          if (active) setError(SCHOOL_HEADS_LOAD_FAILED_MESSAGE);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, STUDIO_HEAD_SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, value]);

  const pick = (head: SchoolHead) => {
    setQuery('');
    onChange(head);
  };

  const showList = query.trim().length >= SCHOOL_HEAD_TYPEAHEAD_MIN_CHARS;

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>{STUDIO_HEAD_LABEL}</label>

      {value ? (
        <div className={styles.createRow}>
          <span className={styles.select}>{headLabel(value)}</span>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => onChange(null)}
          >
            {STUDIO_HEAD_CHANGE_LABEL}
          </button>
        </div>
      ) : (
        <>
          <input
            className={styles.select}
            placeholder={STUDIO_HEAD_PLACEHOLDER}
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {!showList && (
            <p className={styles.hint}>{STUDIO_HEAD_TOO_SHORT_HINT}</p>
          )}
          {showList && (
            <>
              {searching && (
                <p className={styles.comboEmpty}>{STUDIO_HEAD_SEARCHING_LABEL}</p>
              )}
              {!searching && results.length > 0 && (
                <ul className={styles.comboList}>
                  {results.map((head) => (
                    <li key={head.id}>
                      <button
                        type="button"
                        className={styles.comboItem}
                        onClick={() => pick(head)}
                      >
                        {headLabel(head)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && !error && results.length === 0 && (
                <p className={styles.comboEmpty}>{STUDIO_HEAD_NOT_FOUND_LABEL}</p>
              )}
            </>
          )}
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
