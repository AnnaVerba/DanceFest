import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createParticipant, getParticipants } from '../lib/participants';
import type { NewParticipant } from '../lib/participants';
import PhoneField from './PhoneField';
import { isValidBirthDate, isValidName, isValidPhone } from '../lib/validation';
import {
  BIRTH_DATE_INVALID_MESSAGE,
  MIN_BIRTH_DATE,
  PHONE_INVALID_MESSAGE,
} from '../lib/validation.constants';
import { queryKeys } from '../lib/queryKeys';
import { PARTICIPANTS_STALE_TIME_MS } from '../lib/queryClient.constants';
import styles from './CoachRoster.module.css';

const EMPTY_DRAFT: NewParticipant = {
  firstName: '',
  lastName: '',
  phone: '',
  birthDate: '',
};

function formatBirthDate(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
}

export default function CoachRoster() {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewParticipant>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const participantsQuery = useQuery({
    queryKey: queryKeys.participants(),
    queryFn: () => getParticipants(),
    staleTime: PARTICIPANTS_STALE_TIME_MS,
  });
  const participants = participantsQuery.data ?? null;
  const loadError = participantsQuery.isError
    ? 'Не вдалося завантажити список.'
    : null;

  const submit = async () => {
    if (!isValidName(draft.firstName) || !isValidName(draft.lastName)) {
      setFormError('Заповніть імʼя та прізвище.');
      return;
    }
    if (!isValidPhone(draft.phone)) {
      setFormError(PHONE_INVALID_MESSAGE);
      return;
    }
    if (!isValidBirthDate(draft.birthDate)) {
      setFormError(BIRTH_DATE_INVALID_MESSAGE);
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createParticipant({
        ...draft,
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
      });
      await participantsQuery.refetch();
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Не вдалося створити учасника.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.head}>
        <div className={styles.label}>Мої учасники</div>
        {!adding && (
          <button
            type="button"
            className={styles.addBtn}
            onClick={() => setAdding(true)}
          >
            + Додати
          </button>
        )}
      </div>

      {loadError && <p className={styles.error}>{loadError}</p>}

      {participants && participants.length === 0 && !adding && (
        <p className={styles.empty}>Ви ще не додали жодного учасника.</p>
      )}

      {participants && participants.length > 0 && (
        <ul className={styles.list}>
          {participants.map((p) => (
            <li key={p.id} className={styles.row}>
              <span className={styles.name}>
                {p.lastName} {p.firstName}
              </span>
              <span className={styles.meta}>{p.phone}</span>
              <span className={styles.meta}>
                {formatBirthDate(p.birthDate)}
              </span>
              <span
                className={p.hasPassword ? styles.claimed : styles.unclaimed}
              >
                {p.hasPassword ? 'Зареєстрований' : 'Очікує входу'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {adding && (
        <div className={styles.form}>
          <input
            className={styles.input}
            placeholder="Імʼя"
            value={draft.firstName}
            onChange={(e) => setDraft({ ...draft, firstName: e.target.value })}
          />
          <input
            className={styles.input}
            placeholder="Прізвище"
            value={draft.lastName}
            onChange={(e) => setDraft({ ...draft, lastName: e.target.value })}
          />
          <PhoneField
            ariaLabel="Телефон"
            value={draft.phone}
            onChange={(value) => setDraft({ ...draft, phone: value })}
          />
          <input
            className={styles.input}
            type="date"
            min={MIN_BIRTH_DATE}
            max={new Date().toISOString().slice(0, 10)}
            value={draft.birthDate}
            onChange={(e) => setDraft({ ...draft, birthDate: e.target.value })}
          />
          {formError && <p className={styles.error}>{formError}</p>}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.primary}
              disabled={busy}
              onClick={submit}
            >
              {busy ? '…' : 'Зберегти'}
            </button>
            <button
              type="button"
              className={styles.ghost}
              disabled={busy}
              onClick={() => {
                setAdding(false);
                setDraft(EMPTY_DRAFT);
                setFormError(null);
              }}
            >
              Скасувати
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
