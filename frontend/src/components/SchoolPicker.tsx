import { useEffect, useState } from 'react';
import { createSchool, getSchool, searchSchools } from '../lib/schools';
import type { School } from '../lib/schools';
import {
  SCHOOLS_LOAD_FAILED_MESSAGE,
  SCHOOL_TYPEAHEAD_MIN_CHARS,
} from '../lib/schools.constants';
import styles from './SchoolPicker.module.css';

interface SchoolPickerProps {
  value: string;
  onChange: (schoolId: string) => void;
}

// Typeahead over schools: type a couple of letters, pick a match, or type
// a new name and create it. The parent only ever receives a real id.
export default function SchoolPicker({ value, onChange }: SchoolPickerProps) {
  const [selected, setSelected] = useState<School | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve the incoming id to a name for display.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!value) {
        if (!cancelled) setSelected(null);
        return;
      }
      try {
        const s = await getSchool(value);
        if (!cancelled) setSelected(s);
      } catch {
        if (!cancelled) setSelected(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  useEffect(() => {
    if (selected) return;
    const trimmed = query.trim();
    if (trimmed.length < SCHOOL_TYPEAHEAD_MIN_CHARS) return;

    let active = true;
    const t = setTimeout(() => {
      setSearching(true);
      searchSchools(trimmed)
        .then((found) => {
          if (!active) return;
          setResults(found);
          setError(null);
        })
        .catch(() => {
          if (!active) return;
          setResults([]);
          setError(SCHOOLS_LOAD_FAILED_MESSAGE);
        })
        .finally(() => {
          if (active) setSearching(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, selected]);

  const handleCreate = async () => {
    const name = query.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const school = await createSchool(name);
      onChange(school.id);
      setQuery('');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Не вдалося створити школу.',
      );
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <label className={styles.label}>Школа / студія</label>

      {selected ? (
        <div className={styles.createRow}>
          <span className={styles.select}>{selected.name}</span>
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => onChange('')}
          >
            Змінити
          </button>
        </div>
      ) : (
        <>
          <div className={styles.createRow}>
            <input
              className={styles.select}
              placeholder="Почніть вводити назву школи"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className={styles.createBtn}
              disabled={
                creating || query.trim().length < SCHOOL_TYPEAHEAD_MIN_CHARS
              }
              onClick={handleCreate}
            >
              {creating ? '…' : 'Додати'}
            </button>
          </div>
          {query.trim().length < SCHOOL_TYPEAHEAD_MIN_CHARS && (
            <p className={styles.hint}>
              Введіть щонайменше {SCHOOL_TYPEAHEAD_MIN_CHARS} символи, щоб
              побачити список наявних шкіл.
            </p>
          )}
          {query.trim().length >= SCHOOL_TYPEAHEAD_MIN_CHARS && (
            <>
              {searching && <p className={styles.comboEmpty}>Пошук…</p>}
              {!searching && results.length > 0 && (
                <ul className={styles.comboList}>
                  {results.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        className={styles.comboItem}
                        onClick={() => onChange(s.id)}
                      >
                        {s.name}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && !error && results.length === 0 && (
                <p className={styles.comboEmpty}>
                  Нічого не знайдено. Натисніть «Додати», щоб створити нову.
                </p>
              )}
            </>
          )}
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
