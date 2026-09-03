import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthError, register, saveSession } from '../lib/auth';
import { MIN_PASSWORD_LENGTH } from '../lib/auth.constants';
import PhoneField from '../components/PhoneField';
import SchoolPicker from '../components/SchoolPicker';
import { ACCESS_LEVEL } from '../lib/roles';
import type { AccessLevel } from '../lib/roles';
import styles from './LoginPage.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<AccessLevel>(ACCESS_LEVEL.PARTICIPANT);
  const [schoolId, setSchoolId] = useState('');
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
    if (role === ACCESS_LEVEL.COACH && !schoolId) {
      setError('Оберіть або створіть школу.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await register({
        firstName,
        lastName,
        phone,
        email,
        password,
        birthDate,
        role,
        schoolId: role === ACCESS_LEVEL.COACH ? schoolId : undefined,
      });
      saveSession(session);
      navigate('/profile');
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
        <p className={styles.subtitle}>
          Оберіть, як ви берете участь. Організатором можна стати згодом за
          заявкою.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Я реєструюсь як</label>
            <div className={styles.roleToggle}>
              <button
                type="button"
                className={
                  role === ACCESS_LEVEL.PARTICIPANT
                    ? styles.roleOn
                    : styles.roleOff
                }
                onClick={() => setRole(ACCESS_LEVEL.PARTICIPANT)}
              >
                Учасник
              </button>
              <button
                type="button"
                className={
                  role === ACCESS_LEVEL.COACH ? styles.roleOn : styles.roleOff
                }
                onClick={() => setRole(ACCESS_LEVEL.COACH)}
              >
                Тренер
              </button>
            </div>
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label htmlFor="firstName">Ім'я</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                placeholder="Іван"
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="lastName">Прізвище</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                placeholder="Іванов"
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="phone">Телефон</label>
            <PhoneField id="phone" value={phone} onChange={setPhone} />
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
            <label htmlFor="birthDate">Дата народження</label>
            <input
              type="date"
              id="birthDate"
              name="birthDate"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              required
            />
            <p className={styles.hint}>
              Потрібна, щоб подавати власну участь у конкурсах.
            </p>
          </div>

          {role === ACCESS_LEVEL.COACH && (
            <div className={styles.field}>
              <SchoolPicker value={schoolId} onChange={setSchoolId} />
            </div>
          )}

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
