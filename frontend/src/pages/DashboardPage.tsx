import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getStoredAdmin, getToken } from '../lib/auth';
import {
  deleteCompetition,
  getCompetitionStatus,
  getCompetitions,
} from '../lib/competitions';
import type { Competition } from '../lib/competitions';
import styles from './DashboardPage.module.css';

type SortKey = 'date' | 'name' | 'organizer';

function formatDate(iso: string): string {
  return (
    new Date(iso).toLocaleDateString('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) + ' р.'
  );
}

export default function DashboardPage() {
  const admin = getStoredAdmin();

  const [competitions, setCompetitions] = useState<Competition[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [pendingDelete, setPendingDelete] = useState<Competition | null>(null);
  const { toasts, showToast } = useToasts();

  useEffect(() => {
    let cancelled = false;
    getCompetitions()
      .then((data) => {
        if (!cancelled) setCompetitions(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError('Не вдалося завантажити конкурси.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const list = competitions ?? [];
    const q = query.trim().toLowerCase();
    const matched = q
      ? list.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.location.toLowerCase().includes(q) ||
            c.organizer.toLowerCase().includes(q),
        )
      : list;

    const sorted = [...matched];
    if (sortKey === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
    } else if (sortKey === 'organizer') {
      sorted.sort((a, b) => a.organizer.localeCompare(b.organizer, 'uk'));
    } else {
      sorted.sort((a, b) => a.dateFrom.localeCompare(b.dateFrom));
    }
    return sorted;
  }, [competitions, query, sortKey]);

  // "З реквізитами" — конкурси, де заповнені і телефон, і email для зв'язку.
  const stats = useMemo(() => {
    const list = competitions ?? [];
    const now = new Date();
    return {
      total: list.length,
      withContacts: list.filter((c) => c.contactNumber && c.contactEmail).length,
      thisMonth: list.filter((c) => {
        const d = new Date(c.dateFrom);
        return (
          d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
        );
      }).length,
    };
  }, [competitions]);

  const handleDelete = async (competition: Competition) => {
    try {
      await deleteCompetition(competition.id);
      setCompetitions((prev) => prev?.filter((c) => c.id !== competition.id) ?? prev);
      showToast(`Конкурс «${competition.name}» видалено`);
    } catch {
      showToast('Не вдалося видалити конкурс. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AdminHeader />
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.pageTitle}>Конкурси</h1>
              <p className={styles.pageCount}>Всього: {stats.total}</p>
            </div>
            <Link to="/competitions/new" className={styles.btnPrimary}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Новий конкурс
            </Link>
          </div>

          <ul className={styles.stats}>
            <li className={`${styles.stat} ${styles.statBlue}`}>
              <div className={styles.statValue}>{stats.total}</div>
              <div className={styles.statLabel}>Всього конкурсів</div>
            </li>
            <li className={`${styles.stat} ${styles.statGreen}`}>
              <div className={styles.statValue}>{stats.withContacts}</div>
              <div className={styles.statLabel}>З реквізитами</div>
            </li>
            <li className={`${styles.stat} ${styles.statViolet}`}>
              <div className={styles.statValue}>{stats.thisMonth}</div>
              <div className={styles.statLabel}>Цього місяця</div>
            </li>
          </ul>

          <div className={styles.filters}>
            <div className={styles.search}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="M20 20l-3.5-3.5" />
              </svg>
              <input
                type="search"
                placeholder="Пошук за назвою, місцем або організатором..."
                aria-label="Пошук конкурсів"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className={styles.select}
              aria-label="Сортування"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              <option value="date">За датою</option>
              <option value="name">За назвою</option>
              <option value="organizer">За організатором</option>
            </select>
          </div>

          {loading && <p className={styles.status}>Завантаження...</p>}
          {loadError && <p className={styles.status}>{loadError}</p>}

          {!loading && !loadError && (
            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Назва конкурсу</th>
                    <th scope="col">Статус</th>
                    <th scope="col">Дата</th>
                    <th scope="col">Місце</th>
                    <th scope="col">Організатор</th>
                    <th scope="col">Контакт</th>
                    <th scope="col" className={styles.colActions}>
                      <span className={styles.srOnly}>Дії</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        Нічого не знайдено
                      </td>
                    </tr>
                  )}
                  {filtered.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <div className={styles.contest}>
                          <span className={styles.contestIcon} aria-hidden="true">
                            <svg
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
                              <path d="M7 5H4.5v1.5A3.5 3.5 0 0 0 8 10M17 5h2.5v1.5A3.5 3.5 0 0 1 16 10" />
                              <path d="M12 14v3M9 20h6M10 17h4" />
                            </svg>
                          </span>
                          <Link to={`/competitions/${c.id}`} className={styles.contestName}>
                            {c.name}
                          </Link>
                        </div>
                      </td>
                      <td>
                        <span className={styles.badge}>{getCompetitionStatus(c)}</span>
                      </td>
                      <td>{formatDate(c.dateFrom)}</td>
                      <td>{c.location || '—'}</td>
                      <td>{c.organizer || '—'}</td>
                      <td className={styles.contact}>
                        {c.contactNumber && (
                          <div className={styles.contactPhone}>{c.contactNumber}</div>
                        )}
                        {c.contactEmail && (
                          <a href={`mailto:${c.contactEmail}`}>{c.contactEmail}</a>
                        )}
                        {!c.contactNumber && !c.contactEmail && '—'}
                      </td>
                      <td className={styles.colActions}>
                        {admin && c.ownerId === admin.id && (
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Видалити конкурс «${c.name}»`}
                            onClick={() => setPendingDelete(c)}
                          >
                            <svg
                              width="18"
                              height="18"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.9"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 7h16M10 4h4M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити конкурс?"
        description={
          pendingDelete
            ? `Видалити «${pendingDelete.name}»? Цю дію не можна скасувати.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete) : undefined)}
      />

      <ToastStack toasts={toasts} />
    </>
  );
}
