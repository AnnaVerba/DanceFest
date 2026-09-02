import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthError, register, saveSession } from '../lib/auth';
import { MIN_PASSWORD_LENGTH } from '../lib/auth.constants';
import { REGISTERABLE_ROLES, ROLE, ROLE_LABELS } from '../lib/roles';
import type { Role } from '../lib/roles';
import { createSchool, getSchools } from '../lib/schools';
import type { School } from '../lib/schools';
import { SCHOOL_CREATE_FAILED_MESSAGE } from '../lib/schools.constants';
import PhoneField from '../components/PhoneField';
import styles from './LoginPage.module.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(ROLE.ORGANIZER);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [schools, setSchools] = useState<School[]>([]);
  const [schoolId, setSchoolId] = useState('');
  const [creatingSchool, setCreatingSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [schoolBusy, setSchoolBusy] = useState(false);

  useEffect(() => {
    if (role !== ROLE.COACH) return;
    getSchools()
      .then(setSchools)
      .catch(() => setSchools([]));
  }, [role]);

  const handleCreateSchool = async () => {
    if (!newSchoolName.trim()) return;
    setSchoolBusy(true);
    setError(null);
    try {
      const school = await createSchool(newSchoolName.trim());
      setSchools((prev) => [...prev, school]);
      setSchoolId(school.id);
      setCreatingSchool(false);
      setNewSchoolName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : SCHOOL_CREATE_FAILED_MESSAGE);
    } finally {
      setSchoolBusy(false);
    }
  };

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
    if (role === ROLE.COACH && !schoolId) {
      setError('Оберіть або створіть школу/студію');
      return;
    }

    setSubmitting(true);
    try {
      const session = await register({
        role,
        firstName,
        lastName,
        phone,
        email,
        password,
        ...(role === ROLE.PARTICIPANT ? { birthDate } : {}),
        ...(role === ROLE.COACH ? { schoolId } : {}),
      });
      saveSession(session);
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
        <p className={styles.subtitle}>Створіть акаунт</p>

        {error && <p className={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label>Хто ви</label>
            <div className={styles.roleTabs} role="tablist" aria-label="Роль">
              {REGISTERABLE_ROLES.map((r) => (
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

          {role === ROLE.PARTICIPANT && (
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
                Ліга не закріплюється при реєстрації — її обирають при подачі кожної заявки.
              </p>
            </div>
          )}

          {role === ROLE.COACH && (
            <div className={styles.field}>
              <label htmlFor="schoolId">Школа / студія</label>
              <select
                id="schoolId"
                value={schoolId}
                onChange={(e) => setSchoolId(e.target.value)}
                required={!creatingSchool}
                disabled={creatingSchool}
              >
                <option value="">Оберіть школу…</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {!creatingSchool ? (
                <button
                  type="button"
                  className={styles.inlineAction}
                  onClick={() => setCreatingSchool(true)}
                >
                  + Немає потрібної школи — створити
                </button>
              ) : (
                <div className={styles.inlineRow}>
                  <input
                    type="text"
                    placeholder="Назва школи/студії"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                  />
                  <button type="button" onClick={handleCreateSchool} disabled={schoolBusy}>
                    {schoolBusy ? '...' : 'Додати'}
                  </button>
                </div>
              )}
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
