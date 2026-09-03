import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AuthError,
  login,
  resendOtp,
  saveSession,
  verifyOtp,
} from '../lib/auth';
import { MIN_PASSWORD_LENGTH } from '../lib/auth.constants';
import styles from './LoginPage.module.css';

const OTP_LENGTH = 4;
const RESEND_SECONDS = 60;

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stage, setStage] = useState<'login' | 'otp'>('login');
  const [maskedPhone, setMaskedPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
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
      const result = await login(loginId, password);
      if ('otpRequired' in result) {
        setMaskedPhone(result.phone);
        setStage('otp');
        setResendIn(RESEND_SECONDS);
        setCode('');
        setOtpError(null);
      } else {
        saveSession(result);
        navigate('/profile', { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof AuthError
          ? err.message
          : 'Не вдалося увійти. Перевірте дані та пароль.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const submitOtp = async () => {
    setOtpError(null);
    setOtpBusy(true);
    try {
      const session = await verifyOtp(loginId, code, password);
      saveSession(session);
      navigate('/profile', { replace: true });
    } catch (err) {
      setOtpError(err instanceof AuthError ? err.message : 'Невірний код.');
    } finally {
      setOtpBusy(false);
    }
  };

  const doResend = async () => {
    setOtpError(null);
    try {
      const { phone } = await resendOtp(loginId);
      setMaskedPhone(phone);
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setOtpError(
        err instanceof AuthError ? err.message : 'Спробуйте пізніше.',
      );
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

        {stage === 'login' && (
          <>
            <h1 className={styles.title}>Вхід</h1>
            <p className={styles.subtitle}>Увійдіть у свій акаунт</p>

            {error && <p className={styles.error}>{error}</p>}

            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="loginId">Номер телефону або email</label>
                <input
                  type="text"
                  id="loginId"
                  name="loginId"
                  placeholder="+380 67 123 45 67"
                  autoComplete="username"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
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
                  minLength={MIN_PASSWORD_LENGTH}
                  required
                />
                <p className={styles.hint}>
                  Перший вхід? Введіть номер і придумайте пароль — ми
                  надішлемо код підтвердження в SMS.
                </p>
              </div>

              <button
                type="submit"
                className={styles.submit}
                disabled={submitting}
              >
                {submitting ? 'Вхід...' : 'Увійти'}
              </button>
            </form>

            <p className={styles.footer}>
              Немає акаунта? <Link to="/register">Зареєструватися</Link>
            </p>
          </>
        )}

        {stage === 'otp' && (
          <>
            <h1 className={styles.title}>Підтвердження</h1>
            <p className={styles.subtitle}>Ми надіслали код на {maskedPhone}</p>

            {otpError && <p className={styles.error}>{otpError}</p>}

            <div className={styles.field}>
              <label htmlFor="otp">Код із SMS</label>
              <input
                type="text"
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={OTP_LENGTH}
                placeholder="1111"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH),
                  )
                }
              />
            </div>

            <button
              type="button"
              className={styles.submit}
              disabled={otpBusy || code.length !== OTP_LENGTH}
              onClick={submitOtp}
            >
              {otpBusy ? '...' : 'Підтвердити'}
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
                setStage('login');
                setCode('');
                setOtpError(null);
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
