import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AuthError,
  register,
  saveSession,
  startRegistration,
} from '../lib/auth';
import type { RegisterPayload } from '../lib/auth';
import { MIN_BIRTH_DATE } from '../lib/validation.constants';
import { validateRegisterForm } from '../lib/registerForm';
import type {
  RegisterFieldErrors,
  RegisterFormValues,
} from '../lib/registerForm.types';
import PhoneField from '../components/PhoneField';
import PasswordField from '../components/PasswordField';
import OtpStep from '../components/OtpStep';
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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'form' | 'otp'>('form');
  const [maskedPhone, setMaskedPhone] = useState('');
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  const toPayload = (): RegisterPayload => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone,
    email: email.trim(),
    password,
    birthDate,
    role,
  });

  // The account is created only here, after the SMS code is confirmed.
  const confirmCode = async (code: string) => {
    const session = await register(toPayload(), code);
    saveSession(session);
    navigate('/profile');
  };

  const resendCode = async () => (await startRegistration(toPayload())).phone;

  // Editing a field hides its error until the next submit.
  const clearFieldError = (field: keyof RegisterFormValues) => {
    setFieldErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const errors = validateRegisterForm({
      firstName,
      lastName,
      phone,
      email,
      birthDate,
      password,
      confirmPassword,
    });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const { phone: sentTo } = await startRegistration(toPayload());
      setMaskedPhone(sentTo);
      setStage('otp');
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

        {stage === 'otp' && (
          <OtpStep
            phone={maskedPhone}
            backLabel="← Змінити дані"
            onVerify={confirmCode}
            onResend={resendCode}
            onBack={() => setStage('form')}
          />
        )}

        {stage === 'form' && (
          <>
          <h1 className={styles.title}>Реєстрація</h1>
          <p className={styles.subtitle}>
            Оберіть, як ви берете участь. Організатором можна стати згодом за
            заявкою.
          </p>

          {error && <p className={styles.error}>{error}</p>}

          <form onSubmit={handleSubmit} noValidate>
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
                {fieldErrors.firstName && (
                  <p id="firstName-error" className={styles.fieldError}>
                    {fieldErrors.firstName}
                  </p>
                )}
                <input
                  type="text"
                  id="firstName"
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={fieldErrors.firstName ? 'firstName-error' : undefined}
                  className={fieldErrors.firstName ? styles.fieldInvalid : undefined}
                  name="firstName"
                  placeholder="Олена"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearFieldError('firstName');
                  }}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="lastName">Прізвище</label>
                {fieldErrors.lastName && (
                  <p id="lastName-error" className={styles.fieldError}>
                    {fieldErrors.lastName}
                  </p>
                )}
                <input
                  type="text"
                  id="lastName"
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={fieldErrors.lastName ? 'lastName-error' : undefined}
                  className={fieldErrors.lastName ? styles.fieldInvalid : undefined}
                  name="lastName"
                  placeholder="Коваленко"
                  autoComplete="family-name"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearFieldError('lastName');
                  }}
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="phone">Телефон</label>
              {fieldErrors.phone && (
                <p id="phone-error" className={styles.fieldError}>
                  {fieldErrors.phone}
                </p>
              )}
              <PhoneField
                id="phone"
                ariaDescribedBy={fieldErrors.phone ? 'phone-error' : undefined}
                value={phone}
                onChange={(value) => {
                  setPhone(value);
                  clearFieldError('phone');
                }}
                invalid={Boolean(fieldErrors.phone)}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              {fieldErrors.email && (
                <p id="email-error" className={styles.fieldError}>
                  {fieldErrors.email}
                </p>
              )}
              <input
                type="email"
                id="email"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                className={fieldErrors.email ? styles.fieldInvalid : undefined}
                name="email"
                placeholder="olena@example.com"
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearFieldError('email');
                }}
                required
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="birthDate">Дата народження</label>
              {fieldErrors.birthDate && (
                <p id="birthDate-error" className={styles.fieldError}>
                  {fieldErrors.birthDate}
                </p>
              )}
              <input
                type="date"
                id="birthDate"
                aria-invalid={Boolean(fieldErrors.birthDate)}
                aria-describedby={fieldErrors.birthDate ? 'birthDate-error' : undefined}
                className={fieldErrors.birthDate ? styles.fieldInvalid : undefined}
                name="birthDate"
                min={MIN_BIRTH_DATE}
                max={maxBirthDate}
                value={birthDate}
                onChange={(e) => {
                  setBirthDate(e.target.value);
                  clearFieldError('birthDate');
                }}
                required
              />
              <p className={styles.hint}>
                Потрібна, щоб подавати власну участь у конкурсах.
              </p>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Пароль</label>
              {fieldErrors.password && (
                <p id="password-error" className={styles.fieldError}>
                  {fieldErrors.password}
                </p>
              )}
              <PasswordField
                id="password"
                invalid={Boolean(fieldErrors.password)}
                ariaDescribedBy={fieldErrors.password ? 'password-error' : undefined}
                className={fieldErrors.password ? styles.fieldInvalid : undefined}
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  clearFieldError('password');
                }}
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="confirmPassword">Повторіть пароль</label>
              {fieldErrors.confirmPassword && (
                <p id="confirmPassword-error" className={styles.fieldError}>
                  {fieldErrors.confirmPassword}
                </p>
              )}
              <PasswordField
                id="confirmPassword"
                invalid={Boolean(fieldErrors.confirmPassword)}
                ariaDescribedBy={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
                className={fieldErrors.confirmPassword ? styles.fieldInvalid : undefined}
                placeholder="••••••••"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(value) => {
                  setConfirmPassword(value);
                  clearFieldError('confirmPassword');
                }}
              />
            </div>

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? 'Надсилаємо код...' : 'Продовжити'}
            </button>
          </form>

          <p className={styles.footer}>
            Вже маєте акаунт? <Link to="/login">Увійти</Link>
          </p>
          </>
        )}
      </div>
    </main>
  );
}
