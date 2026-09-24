import { useEffect, useState } from 'react';
import SchoolPicker from './SchoolPicker';
import {
  createOrganizerRequest,
  getMyOrganizerRequests,
} from '../lib/organizerRequests';
import type { OrganizerRequest } from '../lib/organizerRequests';
import { getSession, refreshSession } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import styles from './OrganizerRequestForm.module.css';

const STATUS_LABELS: Record<OrganizerRequest['status'], string> = {
  PENDING: 'На розгляді',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  CANCELLED: 'Скасовано',
};

export default function OrganizerRequestForm() {
  const [latest, setLatest] = useState<OrganizerRequest | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [schoolId, setSchoolId] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMyOrganizerRequests()
      .then((rows) => {
        const request = rows[0] ?? null;
        setLatest(request);
        // The admin approves on their own session — ours still has the
        // pre-approval accessLevel cached until we refresh it ourselves.
        const session = getSession();
        if (
          request?.status === 'APPROVED' &&
          session &&
          !meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ORGANIZER)
        ) {
          refreshSession().catch(() => {});
        }
      })
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
      setShowForm(false);
      setSchoolId('');
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося подати заявку.');
    } finally {
      setBusy(false);
    }
  };

  const pending = latest?.status === 'PENDING';

  return (
    <div className={styles.form}>
      {latest && (
        <p className={styles.status}>
          {pending ? 'Заявка на організатора' : 'Попередня заявка'}:{' '}
          <strong>{STATUS_LABELS[latest.status]}</strong>
          {!pending && latest.decisionNote ? ` — ${latest.decisionNote}` : ''}
        </p>
      )}

      {!pending && !showForm && (
        <button
          type="button"
          className={styles.submit}
          onClick={() => setShowForm(true)}
        >
          {latest ? 'Подати нову заявку' : 'Стати організатором'}
        </button>
      )}

      {!pending && showForm && (
        <>
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
        </>
      )}
    </div>
  );
}
