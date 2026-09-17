import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import CabinetLayout from '../components/CabinetLayout';
import UserEditModal from '../components/admin/UserEditModal';
import { getSession } from '../lib/auth';
import { getAdminUsers } from '../lib/adminUsers';
import type { AdminUser } from '../lib/adminUsers.types';
import { ACCESS_LEVEL, ACCESS_LEVEL_LABELS, meetsLevel } from '../lib/roles';
import {
  USERS_LOAD_FAILED_MESSAGE,
  USERS_PAGE_SIZE,
  USERS_SEARCH_DEBOUNCE_MS,
} from './UsersPage.constants';
import styles from './UsersPage.module.css';

export default function UsersPage() {
  const session = getSession();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(search),
      USERS_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(handle);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    getAdminUsers({
      page,
      pageSize: USERS_PAGE_SIZE,
      search: debouncedSearch,
    })
      .then((data) => {
        if (cancelled) return;
        setUsers(data.rows);
        setTotal(data.total);
        setError(null);
      })
      .catch(() => {
        if (!cancelled) setError(USERS_LOAD_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [page, debouncedSearch]);

  if (
    !session ||
    !meetsLevel(session.profile.accessLevel, ACCESS_LEVEL.ADMIN)
  ) {
    return <Navigate to="/login" replace />;
  }

  const pageCount = Math.max(1, Math.ceil(total / USERS_PAGE_SIZE));

  const handleSaved = (saved: AdminUser) => {
    setUsers(
      (prev) => prev?.map((u) => (u.id === saved.id ? saved : u)) ?? prev,
    );
    setEditing(null);
  };

  return (
    <CabinetLayout wide>
      <h1 className={styles.title}>Користувачі</h1>

      <input
        className={styles.search}
        type="search"
        placeholder="Пошук за імʼям, телефоном або email..."
        aria-label="Пошук користувачів"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setPage(0);
        }}
      />

      {error && <p className={styles.error}>{error}</p>}
      {!error && users === null && (
        <p className={styles.status}>Завантаження...</p>
      )}
      {!error && users !== null && users.length === 0 && (
        <p className={styles.status}>Нікого не знайдено.</p>
      )}

      {!error && users !== null && users.length > 0 && (
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Користувач</th>
                <th>Рівень</th>
                <th>Дата народження</th>
                <th>Школа</th>
                <th>
                  <span hidden>Дії</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {`${u.lastName} ${u.firstName}`.trim()}
                    <div className={styles.sub}>
                      {[u.phone, u.email].filter(Boolean).join(' · ')}
                    </div>
                  </td>
                  <td>{ACCESS_LEVEL_LABELS[u.accessLevel]}</td>
                  <td>{u.birthDate ?? '—'}</td>
                  <td>{u.schoolName ?? '—'}</td>
                  <td>
                    <button
                      type="button"
                      className={styles.btnSm}
                      onClick={() => setEditing(u)}
                    >
                      Редагувати
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!error && users !== null && pageCount > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.btnSm}
            disabled={page <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            ← Назад
          </button>
          <span className={styles.pagerInfo}>
            Сторінка {page + 1} з {pageCount} · усього {total}
          </span>
          <button
            type="button"
            className={styles.btnSm}
            disabled={page >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          >
            Далі →
          </button>
        </div>
      )}

      {editing && (
        <UserEditModal
          key={editing.id}
          user={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </CabinetLayout>
  );
}
