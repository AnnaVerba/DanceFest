import { useEffect, useState } from 'react';
import { AuthError } from '../lib/auth';
import { OTP_LENGTH } from '../lib/auth.constants';
import styles from '../pages/LoginPage.module.css';

const RESEND_SECONDS = 60;

interface OtpStepProps {
  // Masked phone the code went to, as the backend returned it.
  phone: string;
  backLabel: string;
  onVerify: (code: string) => Promise<void>;
  // Re-sends the code and resolves with the masked phone.
  onResend: () => Promise<string>;
  onBack: () => void;
}

// The "enter the SMS code" window, moved out of LoginPage so first login
// and registration share it. The code was just sent when this mounts.
export default function OtpStep({
  phone,
  backLabel,
  onVerify,
  onResend,
  onBack,
}: OtpStepProps) {
  const [maskedPhone, setMaskedPhone] = useState(phone);
  const [code, setCode] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpBusy, setOtpBusy] = useState(false);
  const [resendIn, setResendIn] = useState(RESEND_SECONDS);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setInterval(() => setResendIn((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [resendIn]);

  const submitOtp = async () => {
    setOtpError(null);
    setOtpBusy(true);
    try {
      await onVerify(code);
    } catch (err) {
      setOtpError(err instanceof AuthError ? err.message : 'Невірний код.');
    } finally {
      setOtpBusy(false);
    }
  };

  const doResend = async () => {
    setOtpError(null);
    try {
      setMaskedPhone(await onResend());
      setResendIn(RESEND_SECONDS);
    } catch (err) {
      setOtpError(
        err instanceof AuthError ? err.message : 'Спробуйте пізніше.',
      );
    }
  };

  return (
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
            setCode(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))
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

      <button type="button" className={styles.inlineAction} onClick={onBack}>
        {backLabel}
      </button>
    </>
  );
}
