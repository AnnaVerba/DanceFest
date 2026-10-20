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
import ProjectLogo from '../components/ProjectLogo';
import SchoolPicker from '../components/SchoolPicker';
import StudioHeadPicker from '../components/StudioHeadPicker';
import type { SchoolHead } from '../lib/schoolHead.types';
import { PROJECT_LOGO_LABEL } from '../components/ProjectLogo.constants';
import { ACCESS_LEVEL, isStudioStaff } from '../lib/roles';
import type { AccessLevel } from '../lib/roles';
import {
  HEAD_STUDIO_HINT,
  HEAD_STUDIO_REQUIRED_MESSAGE,
  TRAINER_HEAD_HINT,
  TRAINER_STUDIO_HINT,
  TRAINER_STUDIO_REQUIRED_MESSAGE,
} from './RegisterPage.constants';
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
  // The studio of a trainer (ties them to its heads) or of a head.
  const [schoolId, setSchoolId] = useState('');
  // The head a trainer named; choosing one fills in their studio.
  const [head, setHead] = useState<SchoolHead | null>(null);
  const isTrainer = role === ACCESS_LEVEL.TRAINER;
  const needsStudio = isStudioStaff(role);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'form' | 'otp'>('form');
  const [maskedPhone, setMaskedPhone] = useState('');
  const maxBirthDate = new Date().toISOString().slice(0, 10);

  const handleHeadChange = (picked: SchoolHead | null) => {
    setHead(picked);
    if (picked) setSchoolId(picked.schoolId);
  };

  // A studio other than the named head's makes that head the wrong one.
  const handleSchoolChange = (nextSchoolId: string) => {
    setSchoolId(nextSchoolId);
    if (head && head.schoolId !== nextSchoolId) setHead(null);
  };

  const toPayload = (): RegisterPayload => ({
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phone,
    email: email.trim(),
    password,
    birthDate,
    role,
    ...(needsStudio && schoolId ? { schoolId } : {}),
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
    if (needsStudio && !schoolId) {
      setError(
        isTrainer
          ? TRAINER_STUDIO_REQUIRED_MESSAGE
          : HEAD_STUDIO_REQUIRED_MESSAGE,
      );
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
        <div className={styles.brand} role="img" aria-label={PROJECT_LOGO_LABEL}>
          <ProjectLogo className={styles.brandLogo} />
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
                  Керівник
                </button>
                <button
                  type="button"
                  className={isTrainer ? styles.roleOn : styles.roleOff}
                  onClick={() => setRole(ACCESS_LEVEL.TRAINER)}
                >
                  Тренер
                </button>
              </div>
            </div>

            {isTrainer && (
              <div className={styles.field}>
                <StudioHeadPicker value={head} onChange={handleHeadChange} />
                <p className={styles.hint}>{TRAINER_HEAD_HINT}</p>
              </div>
            )}

            {needsStudio && (
              <div className={styles.field}>
                {/* A trainer joins an existing studio; a head may add theirs. */}
                <SchoolPicker
                  value={schoolId}
                  onChange={handleSchoolChange}
                  allowCreate={!isTrainer}
                />
                <p className={styles.hint}>
                  {isTrainer ? TRAINER_STUDIO_HINT : HEAD_STUDIO_HINT}
                </p>
              </div>
            )}

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
