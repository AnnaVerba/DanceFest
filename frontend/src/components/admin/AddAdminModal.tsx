import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import { TeamApiError, inviteAdmin } from '../../lib/team';
import type { TeamInvitation } from '../../lib/team';
import styles from './AddAdminModal.module.css';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface AddAdminModalProps {
  open: boolean;
  competitionId: string;
  onClose: () => void;
  onSuccess: (invitation: TeamInvitation) => void;
  /** Викликається з кнопки «Надіслати повторно» під помилкою «вже надіслано». */
  onResendExisting: (email: string) => Promise<void>;
}

export default function AddAdminModal({
  open,
  competitionId,
  onClose,
  onSuccess,
  onResendExisting,
}: AddAdminModalProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<{
    type: string;
    message: string;
  } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resendState, setResendState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const emailRef = useRef<HTMLInputElement>(null);

  // Батько монтує модалку заново під новим `key` щоразу, коли її відкривають
  // (див. TeamPage), тож стан тут уже «чистий» від початку — лишається
  // тільки поставити фокус як побічний ефект над DOM.
  useEffect(() => {
    if (open) emailRef.current?.focus();
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const trimmedEmail = email.trim();
    if (!EMAIL_RE.test(trimmedEmail)) {
      setFieldError('Введіть коректний email');
      return;
    }
    setFieldError(null);
    setServerError(null);
    setSubmitting(true);

    try {
      const invitation = await inviteAdmin(competitionId, trimmedEmail, name);
      onSuccess(invitation);
    } catch (err) {
      if (err instanceof TeamApiError) {
        setServerError({ type: err.type, message: err.message });
      } else {
        setServerError({
          type: 'unknown',
          message: 'Не вдалося надіслати запрошення. Спробуйте ще раз.',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleInlineResend = async () => {
    setResendState('sending');
    await onResendExisting(email.trim());
    setResendState('sent');
  };

  return (
    <Modal open={open} title="Додати адміна" onClose={onClose} closeDisabled={submitting}>
      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.field}>
          <label htmlFor="invite-email">Email</label>
          <input
            ref={emailRef}
            id="invite-email"
            type="email"
            autoComplete="email"
            placeholder="admin@studio.ua"
            className={fieldError || serverError ? styles.invalid : ''}
            value={email}
            disabled={submitting}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldError(null);
              setServerError(null);
              setResendState('idle');
            }}
          />
          {fieldError && <p className={styles.fieldError}>{fieldError}</p>}
          {serverError && (
            <p className={styles.fieldError}>
              {serverError.message}
              {serverError.type === 'already-invited' && (
                <button
                  type="button"
                  className={styles.inlineResend}
                  disabled={resendState !== 'idle'}
                  onClick={handleInlineResend}
                >
                  {resendState === 'idle' && 'Надіслати повторно'}
                  {resendState === 'sending' && 'Надсилаємо…'}
                  {resendState === 'sent' && 'Надіслано ще раз ✓'}
                </button>
              )}
            </p>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="invite-name">ПІБ</label>
          <input
            id="invite-name"
            type="text"
            placeholder="Ім'я та прізвище"
            value={name}
            disabled={submitting}
            onChange={(e) => setName(e.target.value)}
          />
          <p className={styles.hint}>
            щоб бачити, хто це, до прийняття запрошення
          </p>
        </div>

        <button type="submit" className={styles.submit} disabled={!email.trim() || submitting}>
          {submitting && <span className={styles.spinner} aria-hidden="true" />}
          {submitting ? 'Надсилання…' : 'Надіслати запрошення'}
        </button>
      </form>
    </Modal>
  );
}
