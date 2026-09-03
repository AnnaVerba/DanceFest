import { useEffect, useState } from 'react';
import SchoolPicker from './SchoolPicker';
import {
  createOrganizerRequest,
  getMyOrganizerRequests,
} from '../lib/organizerRequests';
import type { OrganizerRequest } from '../lib/organizerRequests';
import styles from './OrganizerRequestForm.module.css';

const STATUS_LABELS: Record<OrganizerRequest['status'], string> = {
  PENDING: 'На розгляді',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  CANCELLED: 'Скасовано',
};

export default function OrganizerRequestForm() {
  const [latest, setLatest] = useState<OrganizerRequest | null>(null);
  const [schoolId, setSchoolId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganizerRequests()
      .then((rows) => setLatest(rows[0] ?? null))
      .catch(() => setLatest(null));
  }, []);

  const submit = async () => {
    if (!schoolId) {
      setError('Оберіть або створіть школу.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createOrganizerRequest({
        schoolId,
        note: note.trim() || undefined,
      });
      setLatest(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося подати заявку.');
    } finally {
      setBusy(false);
    }
  };

  if (latest && latest.status === 'PENDING') {
    return (
      <p className={styles.status}>
        Заявка на організатора: <strong>{STATUS_LABELS[latest.status]}</strong>
      </p>
    );
  }

  return (
    <div className={styles.form}>
      {latest && (
        <p className={styles.status}>
          Попередня заявка: <strong>{STATUS_LABELS[latest.status]}</strong>
          {latest.decisionNote ? ` — ${latest.decisionNote}` : ''}
        </p>
      )}
      <SchoolPicker value={schoolId} onChange={setSchoolId} />
      <textarea
        className={styles.note}
        placeholder="Кілька слів про себе (необовʼязково)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      {error && <p className={styles.error}>{error}</p>}
      <button
        type="button"
        className={styles.submit}
        disabled={busy}
        onClick={submit}
      >
        {busy ? '…' : 'Подати заявку на організатора'}
      </button>
    </div>
  );
}
