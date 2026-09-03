import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import { getSession } from '../lib/auth';
import { ACCESS_LEVEL, meetsLevel } from '../lib/roles';
import {
  listOrganizerRequests,
  reviewOrganizerRequest,
} from '../lib/organizerRequests';
import type { OrganizerRequest } from '../lib/organizerRequests';
import styles from './OrganizerRequestsPage.module.css';

const STATUS_LABELS: Record<OrganizerRequest['status'], string> = {
  PENDING: 'На розгляді',
  APPROVED: 'Схвалено',
  REJECTED: 'Відхилено',
  CANCELLED: 'Скасовано',
};

export default function OrganizerRequestsPage() {
  const session = getSession();
  const [rows, setRows] = useState<OrganizerRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => {
    listOrganizerRequests()
      .then(setRows)
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Помилка завантаження.'),
      );
  };

  useEffect(load, []);

  if (!session || !meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ADMIN)) {
    return <Navigate to="/login" replace />;
  }

  const decide = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    setBusyId(id);
    setError(null);
    try {
      const decisionNote =
        status === 'REJECTED'
          ? (window.prompt('Причина відмови (необовʼязково)') ?? undefined)
          : undefined;
      await reviewOrganizerRequest(id, { status, decisionNote });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не вдалося оновити.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <CabinetLayout>
      <h1 className={styles.title}>Заявки на організатора</h1>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Користувач</th>
              <th>Школа</th>
              <th>Коментар</th>
              <th>Статус</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.userId}</td>
                <td>{r.schoolId}</td>
                <td>{r.note ?? '—'}</td>
                <td>{STATUS_LABELS[r.status]}</td>
                <td>
                  {r.status === 'PENDING' && (
                    <div className={styles.actions}>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, 'APPROVED')}
                      >
                        Схвалити
                      </button>
                      <button
                        type="button"
                        disabled={busyId === r.id}
                        onClick={() => decide(r.id, 'REJECTED')}
                      >
                        Відхилити
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CabinetLayout>
  );
}
