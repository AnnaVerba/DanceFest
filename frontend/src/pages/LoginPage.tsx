import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthError, login, saveSession } from '../lib/auth';
import { LOGINABLE_ROLES, ROLE_LABELS } from '../lib/roles';
import type { Role } from '../lib/roles';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>('PARTICIPANT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const session = await login(email, password, role);
      saveSession(session);
      navigate(role === 'ADMIN' ? '/dashboard' : '/', { replace: true });
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Не вдалося увійти. Перевірте email та пароль.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <div className={styles.brandMark} aria-hidden="true">
            <svg
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 4h12v5a6 6 0 0 1-12 0V4Z" />
              <path d="M6 6H4a2 2 0 0 0 0 4h2" />
              <path d="M18 6h2a2 2 0 0 1 0 4h-2" />
              <path d="M12 15v3" />
              <path d="M8.5 21h7" />
              <path d="M10 18h4v3h-4z" />
            </svg>
          </div>
          <div>
            <div className={styles.brandName}>CompAdmin</div>
            <div className={styles.brandTagline}>Управління конкурсами</div>
          </div>
        </div>

        <h1 className={styles.title}>Вхід</h1>
        <p className={styles.subtitle}>Увійдіть у свій акаунт</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Вхід як</label>
            <div className={styles.roleTabs} role="tablist" aria-label="Роль">
              {LOGINABLE_ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={role === r}
                  className={`${styles.roleTab} ${role === r ? styles.roleTabActive : ''}`}
                  onClick={() => setRole(r)}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="user@example.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              name="password"
              placeholder="••••••••"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Вхід...' : 'Увійти'}
          </button>
        </form>

        <p className={styles.footer}>
          Немає акаунта? <Link to="/register">Зареєструватися</Link>
        </p>
      </div>
    </main>
  );
}
