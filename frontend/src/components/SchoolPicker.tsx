import { useEffect, useState } from 'react';
import { createSchool, getSchools } from '../lib/schools';
import type { School } from '../lib/schools';
import styles from './SchoolPicker.module.css';

interface SchoolPickerProps {
  value: string;
  onChange: (schoolId: string) => void;
}

// Resolves to an existing school id, or creates one from a typed name and
// then reports its id. The parent only ever receives a real school id.
export default function SchoolPicker({ value, onChange }: SchoolPickerProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]));
  }, []);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const school = await createSchool(name);
      setSchools((prev) => [...prev, school]);
      onChange(school.id);
      setNewName('');
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
      <select
        className={styles.select}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Оберіть школу…</option>
        {schools.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      {!value && (
        <div className={styles.createRow}>
          <input
            className={styles.input}
            placeholder="…або впишіть нову назву"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <button
            type="button"
            className={styles.createBtn}
            disabled={creating || !newName.trim()}
            onClick={handleCreate}
          >
            {creating ? '…' : 'Додати'}
          </button>
        </div>
      )}
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
}
