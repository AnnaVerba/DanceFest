import { useEffect, useMemo, useState } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { getNominations } from '../../lib/nominations';
import {
  deleteRegistration,
  getRegistrations,
  updatePerformanceStatus,
  updateRegistrationStatus,
} from '../../lib/registrations';
import type {
  PerformanceStatus,
  Registration,
  RegistrationStatus,
} from '../../lib/registrations';
import styles from './EntriesPanel.module.css';

interface RegistrationsPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

const ALL = '__all__';

const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  draft: 'Чернетка',
  submitted: 'Подано',
  confirmed: 'Підтверджено',
  cancelled: 'Скасовано',
};

const PERFORMANCE_STATUS_LABELS: Record<PerformanceStatus, string> = {
  scheduled: 'Заплановано',
  absent: 'Відсутній',
  withdrawn: 'Знято',
};

export default function RegistrationsPanel({
  competitionId,
  canManage,
  onError,
}: RegistrationsPanelProps) {
  const [registrations, setRegistrations] = useState<Registration[] | null>(null);
  const [nominationNames, setNominationNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<Registration | null>(null);

  const [search, setSearch] = useState('');
  const [nominationFilter, setNominationFilter] = useState(ALL);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getRegistrations(competitionId), getNominations(competitionId)])
      .then(([regs, noms]) => {
        if (cancelled) return;
        setRegistrations(regs);
        setNominationNames(Object.fromEntries(noms.map((n) => [n.id, n.name])));
      })
      .catch(() => {
        if (!cancelled) onError('Не вдалося завантажити заявки.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const handleDelete = async (registration: Registration) => {
    try {
      await deleteRegistration(competitionId, registration.id);
      setRegistrations((prev) => prev?.filter((r) => r.id !== registration.id) ?? prev);
    } catch {
      onError('Не вдалося видалити заявку. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  const handleStatusChange = async (registration: Registration, status: RegistrationStatus) => {
    try {
      const updated = await updateRegistrationStatus(competitionId, registration.id, status);
      setRegistrations((prev) =>
        prev?.map((r) => (r.id === registration.id ? updated : r)) ?? prev,
      );
    } catch {
      onError('Не вдалося змінити статус заявки.');
    }
  };

  const handlePerformanceStatusChange = async (
    registration: Registration,
    performanceId: string,
    status: PerformanceStatus,
  ) => {
    try {
      const updated = await updatePerformanceStatus(
        competitionId,
        registration.id,
        performanceId,
        status,
      );
      setRegistrations((prev) =>
        prev?.map((r) => (r.id === registration.id ? updated : r)) ?? prev,
      );
    } catch {
      onError('Не вдалося змінити статус виступу.');
    }
  };

  const nominationOptions = useMemo(() => {
    const ids = new Set((registrations ?? []).map((r) => r.nominationId));
    return Array.from(ids).map((id) => ({ id, name: nominationNames[id] ?? id }));
  }, [registrations, nominationNames]);

  const filtered = useMemo(() => {
    if (!registrations) return [];
    const query = search.trim().toLowerCase();
    return registrations.filter((r) => {
      if (nominationFilter !== ALL && r.nominationId !== nominationFilter) return false;
      if (!query) return true;
      return (
        (r.routineName?.toLowerCase().includes(query) ?? false) ||
        (r.studioName?.toLowerCase().includes(query) ?? false) ||
        (r.coach?.name.toLowerCase().includes(query) ?? false) ||
        r.participants.some((p) => p.name.toLowerCase().includes(query))
      );
    });
  }, [registrations, search, nominationFilter]);

  return (
    <section className={styles.panel}>
      <div className={styles.intro}>
        <p className={styles.note}>
          Заявки подають самі учасники через форму реєстрації на конкурс — тут ви
          переглядаєте подані заявки та керуєте їхнім статусом.
        </p>
        <a
          className={styles.btn}
          href={`/competitions/${competitionId}/apply`}
          target="_blank"
          rel="noopener"
        >
          Форма подачі заявки ↗
        </a>
      </div>

      <div className={styles.filters}>
        <input
          className={`${styles.field} ${styles.search}`}
          type="search"
          placeholder="Пошук за назвою, студією, тренером, учасником..."
          aria-label="Пошук заявок"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.field}
          aria-label="Номінація"
          value={nominationFilter}
          onChange={(e) => setNominationFilter(e.target.value)}
        >
          <option value={ALL}>Усі номінації</option>
          {nominationOptions.map((n) => (
            <option key={n.id} value={n.id}>
              {n.name}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className={styles.status}>Завантаження...</p>}

      {!loading && registrations && registrations.length === 0 && (
        <p className={styles.empty}>На цей конкурс ще не подано жодної заявки.</p>
      )}

      {!loading && registrations && registrations.length > 0 && (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">Назва номеру</th>
                <th scope="col">Номінація</th>
                <th scope="col">Учасники</th>
                <th scope="col">Тренер</th>
                <th scope="col">Студія</th>
                <th scope="col">Статус заявки</th>
                <th scope="col">Виступ</th>
                {canManage && (
                  <th scope="col" className={styles.colActions}>
                    <span hidden>Дії</span>
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={canManage ? 8 : 7} className={styles.noMatches}>
                    Нічого не знайдено за обраними фільтрами.
                  </td>
                </tr>
              )}
              {filtered.map((registration) => (
                <tr key={registration.id}>
                  <td className={styles.name}>{registration.routineName ?? '—'}</td>
                  <td>{nominationNames[registration.nominationId] ?? registration.nominationId}</td>
                  <td>{registration.participants.map((p) => p.name).join(', ') || '—'}</td>
                  <td>{registration.coach?.name ?? '—'}</td>
                  <td>{registration.studioName ?? '—'}</td>
                  <td>
                    {canManage ? (
                      <select
                        aria-label={`Статус заявки «${registration.routineName ?? ''}»`}
                        value={registration.status}
                        onChange={(e) =>
                          void handleStatusChange(
                            registration,
                            e.target.value as RegistrationStatus,
                          )
                        }
                      >
                        {(Object.keys(REGISTRATION_STATUS_LABELS) as RegistrationStatus[]).map(
                          (status) => (
                            <option key={status} value={status}>
                              {REGISTRATION_STATUS_LABELS[status]}
                            </option>
                          ),
                        )}
                      </select>
                    ) : (
                      REGISTRATION_STATUS_LABELS[registration.status]
                    )}
                  </td>
                  <td>
                    {registration.performances.map((perf) =>
                      canManage ? (
                        <select
                          key={perf.id}
                          aria-label={`Статус виступу «${registration.routineName ?? ''}»`}
                          value={perf.status}
                          onChange={(e) =>
                            void handlePerformanceStatusChange(
                              registration,
                              perf.id,
                              e.target.value as PerformanceStatus,
                            )
                          }
                        >
                          {(Object.keys(PERFORMANCE_STATUS_LABELS) as PerformanceStatus[]).map(
                            (status) => (
                              <option key={status} value={status}>
                                {PERFORMANCE_STATUS_LABELS[status]}
                              </option>
                            ),
                          )}
                        </select>
                      ) : (
                        <span key={perf.id}>{PERFORMANCE_STATUS_LABELS[perf.status]}</span>
                      ),
                    )}
                  </td>
                  {canManage && (
                    <td className={styles.colActions}>
                      <button
                        className={styles.iconBtn}
                        type="button"
                        aria-label={`Видалити заявку «${registration.routineName ?? ''}»`}
                        onClick={() => setPendingDelete(registration)}
                      >
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                        >
                          <path d="M6 6l12 12M18 6L6 18" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити заявку?"
        description={
          pendingDelete
            ? `Видалити заявку «${pendingDelete.routineName ?? ''}»? Ця дія незворотна.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete) : undefined)}
      />
    </section>
  );
}
