import { useState } from 'react';
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
import PhoneField from '../components/PhoneField';
import OtpStep from '../components/OtpStep';
import ProjectLogo from '../components/ProjectLogo';
import { PROJECT_LOGO_LABEL } from '../components/ProjectLogo.constants';
import styles from './LoginPage.module.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [stage, setStage] = useState<'login' | 'otp'>('login');
  const [maskedPhone, setMaskedPhone] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(loginId, password);
      if ('otpRequired' in result) {
        setMaskedPhone(result.phone);
        setStage('otp');
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

  const submitOtp = async (code: string) => {
    const session = await verifyOtp(loginId, code, password);
    saveSession(session);
    navigate('/profile', { replace: true });
  };

  const doResend = async () => (await resendOtp(loginId)).phone;

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand} role="img" aria-label={PROJECT_LOGO_LABEL}>
          <ProjectLogo className={styles.brandLogo} />
        </div>

        {stage === 'login' && (
          <>
            <h1 className={styles.title}>Вхід</h1>
            <p className={styles.subtitle}>Увійдіть у свій акаунт</p>

            {error && <p className={styles.error}>{error}</p>}

            <form onSubmit={handleSubmit}>
              <div className={styles.field}>
                <label htmlFor="loginId">Номер телефону</label>
                <PhoneField id="loginId" value={loginId} onChange={setLoginId} />
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
          <OtpStep
            phone={maskedPhone}
            backLabel="← Змінити номер"
            onVerify={submitOtp}
            onResend={doResend}
            onBack={() => setStage('login')}
          />
        )}
      </div>
    </main>
  );
}
