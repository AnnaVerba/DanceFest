import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AuthError,
  forgotPassword,
  resetPassword,
  saveSession,
} from '../lib/auth';
import {
  MIN_PASSWORD_LENGTH,
  OTP_LENGTH,
  PASSWORD_MISMATCH_MESSAGE,
  PASSWORD_TOO_SHORT_MESSAGE,
} from '../lib/auth.constants';
import PhoneField from '../components/PhoneField';
import ProjectLogo from '../components/ProjectLogo';
import { PROJECT_LOGO_LABEL } from '../components/ProjectLogo.constants';
import styles from './LoginPage.module.css';

const RESEND_SECONDS = 60;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stage, setStage] = useState<'request' | 'reset'>('request');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { phone } = await forgotPassword(loginId);
      setMaskedPhone(phone);
      setStage('reset');
      setResendIn(RESEND_SECONDS);
      setCode('');
      setPassword('');
      setConfirmPassword('');
      setResetError(null);
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Не вдалося надіслати код. Перевірте номер телефону.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitReset = async () => {
    setResetError(null);
    if (password.length < MIN_PASSWORD_LENGTH) {
      setResetError(PASSWORD_TOO_SHORT_MESSAGE);
      return;
    }
    if (password !== confirmPassword) {
      setResetError(PASSWORD_MISMATCH_MESSAGE);
      return;
    }
    setResetBusy(true);
    try {
      const session = await resetPassword(loginId, code, password);
      saveSession(session);
      navigate('/profile', { replace: true });
    } catch (err) {
      setResetError(err instanceof AuthError ? err.message : 'Невірний код.');
    } finally {
      setResetBusy(false);
    }
  };

  const doResend = async () => {
    setResetError(null);
    try {
      const { phone } = await forgotPassword(loginId);
      setMaskedPhone(phone);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setResetError(
        err instanceof AuthError ? err.message : 'Спробуйте пізніше.',
      );
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand} role="img" aria-label={PROJECT_LOGO_LABEL}>
          <ProjectLogo className={styles.brandLogo} />
        </div>

        {stage === 'request' && (
          <>
            <h1 className={styles.title}>Відновлення паролю</h1>
            <p className={styles.subtitle}>
              Введіть номер телефону — ми надішлемо код підтвердження в SMS.
            </p>

            {error && <p className={styles.error}>{error}</p>}

            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="loginId">Номер телефону</label>
                <PhoneField id="loginId" value={loginId} onChange={setLoginId} />
              </div>

              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
              >
                {submitting ? 'Надсилання...' : 'Надіслати код'}
              </button>
            </form>

            <p className={styles.footer}>
              Згадали пароль? <Link to="/login">Увійти</Link>
            </p>
          </>
        )}

        {stage === 'reset' && (
          <>
            <h1 className={styles.title}>Новий пароль</h1>
            <p className={styles.subtitle}>Ми надіслали код на {maskedPhone}</p>

            {resetError && <p className={styles.error}>{resetError}</p>}

            <div className={styles.field}>
              <label htmlFor="otp">Код із SMS</label>
              <p className={styles.hint}>Код складається з {OTP_LENGTH} цифр</p>
              <input
                type="text"
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH),
                  )
                }
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Новий пароль</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="••••••••"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={MIN_PASSWORD_LENGTH}
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
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>

            <button
              type="button"
              className={styles.submit}
              disabled={
                resetBusy ||
                code.length !== OTP_LENGTH ||
                !password ||
                !confirmPassword
              }
              onClick={submitReset}
            >
              {resetBusy ? '...' : 'Змінити пароль'}
            </button>

            <button
              type="button"
              className={styles.inlineAction}
              disabled={resendIn > 0}
              onClick={doResend}
            >
              {resendIn > 0
                ? `Надіслати код ще раз (${resendIn})`
                : 'Надіслати код ще раз'}
            </button>

            <button
              type="button"
              className={styles.inlineAction}
              onClick={() => {
                setStage('request');
                setCode('');
                setResetError(null);
              }}
            >
              ← Змінити номер
            </button>
          </>
        )}
      </div>
    </main>
  );
}
