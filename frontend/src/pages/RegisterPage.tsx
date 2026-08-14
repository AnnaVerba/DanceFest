import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthError, register, saveSession } from '../lib/auth';
import styles from './LoginPage.module.css';

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Пароль має містити щонайменше ${MIN_PASSWORD_LENGTH} символів`);
      return;
    }
    if (password !== confirmPassword) {
      setError('Паролі не збігаються');
      return;
    }

    setSubmitting(true);
    try {
      const auth = await register(name, email, password);
      saveSession(auth);
      navigate('/');
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Не вдалося зареєструватися. Спробуйте ще раз.',
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

        <h1 className={styles.title}>Реєстрація</h1>
        <p className={styles.subtitle}>Створіть акаунт адміністратора конкурсів</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">ПІБ</label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="Анна Верба"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              placeholder="admin@studio.ua"
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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Повторіть пароль</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              placeholder="••••••••"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Реєстрація...' : 'Зареєструватися'}
          </button>
        </form>

        <p className={styles.footer}>
          Вже маєте акаунт? <Link to="/login">Увійти</Link>
        </p>
      </div>
    </main>
  );
}
