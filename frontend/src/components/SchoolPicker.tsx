import { useEffect, useState } from 'react';
import { createSchool, getSchool, searchSchools } from '../lib/schools';
import type { School } from '../lib/schools';
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
    const t = setTimeout(() => {
      searchSchools(query)
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
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
              placeholder="…або впишіть нову назву"
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button
              type="button"
              className={styles.createBtn}
              disabled={creating || query.trim().length < 2}
              onClick={handleCreate}
            >
              {creating ? '…' : 'Додати'}
            </button>
          </div>
          {query.trim().length >= 2 && results.length > 0 && (
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
        </>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
