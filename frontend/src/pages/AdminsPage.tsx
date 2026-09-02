import { useState } from 'react';
import type { FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { getSession, getToken } from '../lib/auth';
import { MIN_PASSWORD_LENGTH } from '../lib/auth.constants';
import { AdminApiError, createAdmin } from '../lib/admins';
import { ROLE, ROLE_CABINET_PATH } from '../lib/roles';
import styles from './AdminsPage.module.css';

export default function AdminsPage() {
  const session = getSession();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [successEmail, setSuccessEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!getToken() || !session) {
    return <Navigate to="/login" replace />;
  }
  if (session.role !== ROLE.ADMIN) {
    return <Navigate to={ROLE_CABINET_PATH[session.role]} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccessEmail(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createAdmin({ name: name.trim(), email: email.trim(), password });
      setSuccessEmail(created.email);
      setName('');
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : 'Не вдалося створити адміністратора.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AdminHeader />
      <main className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Адміністратори</h1>
          <p className={styles.subtitle}>
            Створити ще одного адміністратора. Самостійна реєстрація адміна закрита —
            це єдиний спосіб додати новий обліковий запис адміністратора.
          </p>

          <section className={styles.card}>
            {error && <p className={styles.error}>{error}</p>}
            {successEmail && (
              <p className={styles.success}>Адміністратора {successEmail} створено.</p>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="admin-name">ПІБ</label>
                <input
                  id="admin-name"
                  type="text"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="admin-email">Email</label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="admin-password">Пароль</label>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className={styles.submitBtn} disabled={submitting}>
                {submitting ? 'Створення...' : 'Створити адміністратора'}
              </button>
            </form>
          </section>
        </div>
      </main>
    </>
  );
}
