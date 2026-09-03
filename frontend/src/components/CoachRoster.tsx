import { useEffect, useState } from 'react';
import { createParticipant, getParticipants } from '../lib/participants';
import type { NewParticipant, Participant } from '../lib/participants';
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
  const [participants, setParticipants] = useState<Participant[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewParticipant>(EMPTY_DRAFT);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    getParticipants()
      .then(setParticipants)
      .catch((err) =>
        setLoadError(
          err instanceof Error ? err.message : 'Не вдалося завантажити список.',
        ),
      );
  }, []);

  const canSubmit =
    draft.firstName.trim() &&
    draft.lastName.trim() &&
    draft.phone.trim() &&
    draft.birthDate;

  const submit = async () => {
    if (!canSubmit) {
      setFormError('Заповніть імʼя, прізвище, телефон і дату народження.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      const created = await createParticipant(draft);
      setParticipants((prev) => [...(prev ?? []), created]);
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
          <input
            className={styles.input}
            placeholder="Телефон"
            value={draft.phone}
            onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
          />
          <input
            className={styles.input}
            type="date"
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
