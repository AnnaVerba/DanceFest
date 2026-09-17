import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Modal from './Modal';
import EntryParticipantsField from './EntryParticipantsField';
import { getEntry, updateEntry } from '../../lib/entries';
import type { Entry } from '../../lib/entries';
import { getNominations } from '../../lib/nominations';
import type { Nomination } from '../../lib/nominations';
import type {
  EntryDetails,
  EntryParticipant,
  PaymentMethod,
} from '../../lib/entryEdit.types';
import {
  ENTRY_LOAD_FAILED_MESSAGE,
  ENTRY_SAVE_FAILED_MESSAGE,
  NO_PAYMENT_METHOD,
  PAYMENT_METHOD_LABELS,
  ROUTINE_NAME_REQUIRED_MESSAGE,
} from './EntryEditModal.constants';
import styles from './EditForm.module.css';

interface EntryEditModalProps {
  competitionId: string;
  // Mounted per entry (keyed by id), so its state starts fresh each time.
  entryId: string;
  onClose: () => void;
  onSaved: (entry: Entry) => void;
}

interface EntryForm {
  routineName: string;
  nominationId: string;
  participants: EntryParticipant[];
  studioName: string;
  choreographer: string;
  city: string;
  improv: boolean;
  paymentMethod: PaymentMethod | typeof NO_PAYMENT_METHOD;
}

function toForm(entry: EntryDetails): EntryForm {
  return {
    routineName: entry.routineName,
    nominationId: entry.nominationId ?? '',
    participants: entry.participants,
    studioName: entry.studioName ?? '',
    choreographer: entry.choreographer ?? '',
    city: entry.city ?? '',
    improv: entry.improv ?? false,
    paymentMethod: entry.paymentMethod ?? NO_PAYMENT_METHOD,
  };
}

export default function EntryEditModal({
  competitionId,
  entryId,
  onClose,
  onSaved,
}: EntryEditModalProps) {
  const [form, setForm] = useState<EntryForm | null>(null);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      getEntry(competitionId, entryId),
      getNominations(competitionId),
    ])
      .then(([entry, noms]) => {
        if (cancelled) return;
        setForm(toForm(entry));
        setNominations(noms);
      })
      .catch(() => {
        if (!cancelled) setLoadError(ENTRY_LOAD_FAILED_MESSAGE);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, entryId]);

  const patch = (changes: Partial<EntryForm>) =>
    setForm((prev) => (prev ? { ...prev, ...changes } : prev));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || submitting) return;
    if (!form.routineName.trim()) {
      setSaveError(ROUTINE_NAME_REQUIRED_MESSAGE);
      return;
    }
    setSubmitting(true);
    setSaveError(null);
    try {
      const saved = await updateEntry(competitionId, entryId, {
        routineName: form.routineName.trim(),
        ...(form.nominationId && { nominationId: form.nominationId }),
        ...(form.participants.length > 0 && {
          participantIds: form.participants.map((p) => p.id),
        }),
        studioName: form.studioName,
        choreographer: form.choreographer,
        city: form.city,
        improv: form.improv,
        ...(form.paymentMethod !== NO_PAYMENT_METHOD && {
          paymentMethod: form.paymentMethod,
        }),
      });
      onSaved(saved);
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : ENTRY_SAVE_FAILED_MESSAGE,
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      title="Редагувати заявку"
      onClose={onClose}
      closeDisabled={submitting}
    >
      {loadError && <p className={styles.error}>{loadError}</p>}
      {!loadError && !form && <p className={styles.status}>Завантаження...</p>}
      {form && (
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="entry-routine-name">
              Назва номеру
            </label>
            <input
              id="entry-routine-name"
              className={styles.input}
              value={form.routineName}
              onChange={(e) => patch({ routineName: e.target.value })}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="entry-nomination">
              Номінація
            </label>
            <select
              id="entry-nomination"
              className={styles.input}
              value={form.nominationId}
              onChange={(e) => patch({ nominationId: e.target.value })}
            >
              {!form.nominationId && <option value="">—</option>}
              {nominations.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.name}
                </option>
              ))}
            </select>
          </div>

          <EntryParticipantsField
            selected={form.participants}
            onAdd={(participant) =>
              patch({ participants: [...form.participants, participant] })
            }
            onRemove={(participantId) =>
              patch({
                participants: form.participants.filter(
                  (p) => p.id !== participantId,
                ),
              })
            }
          />

          <div className={styles.two}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="entry-studio">
                Студія
              </label>
              <input
                id="entry-studio"
                className={styles.input}
                value={form.studioName}
                onChange={(e) => patch({ studioName: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="entry-choreographer">
                Хореограф
              </label>
              <input
                id="entry-choreographer"
                className={styles.input}
                value={form.choreographer}
                onChange={(e) => patch({ choreographer: e.target.value })}
              />
            </div>
          </div>

          <div className={styles.two}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="entry-city">
                Місто
              </label>
              <input
                id="entry-city"
                className={styles.input}
                value={form.city}
                onChange={(e) => patch({ city: e.target.value })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="entry-payment">
                Спосіб оплати
              </label>
              <select
                id="entry-payment"
                className={styles.input}
                value={form.paymentMethod}
                onChange={(e) =>
                  patch({
                    paymentMethod: e.target.value as EntryForm['paymentMethod'],
                  })
                }
              >
                {form.paymentMethod === NO_PAYMENT_METHOD && (
                  <option value={NO_PAYMENT_METHOD}>—</option>
                )}
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(
                  (method) => (
                    <option key={method} value={method}>
                      {PAYMENT_METHOD_LABELS[method]}
                    </option>
                  ),
                )}
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={form.improv}
                onChange={(e) => patch({ improv: e.target.checked })}
              />
              Імпровізація
            </label>
          </div>

          {saveError && <p className={styles.error}>{saveError}</p>}
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Збереження…' : 'Зберегти'}
          </button>
        </form>
      )}
    </Modal>
  );
}
