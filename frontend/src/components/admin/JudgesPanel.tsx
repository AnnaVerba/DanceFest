import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { createJudge, deleteJudge, getJudges } from '../../lib/judges';
import type { CreatedJudge, Judge } from '../../lib/judges';
import styles from './JudgesPanel.module.css';

interface JudgesPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

type PanelJudge = Judge & { tempPassword?: string; emailSent?: boolean };

export default function JudgesPanel({
  competitionId,
  canManage,
  onError,
}: JudgesPanelProps) {
  const [judges, setJudges] = useState<PanelJudge[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PanelJudge | null>(null);

  useEffect(() => {
    let cancelled = false;
    getJudges(competitionId)
      .then((data) => {
        if (!cancelled) setJudges(data);
      })
      .catch(() => {
        if (!cancelled) onError('Не вдалося завантажити суддів.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || submitting) return;
    setSubmitting(true);
    try {
      const created: CreatedJudge = await createJudge(competitionId, name, email);
      setJudges((prev) => [...(prev ?? []), created]);
      setName('');
      setEmail('');
    } catch {
      onError('Не вдалося додати суддю. Перевірте дані та спробуйте ще раз.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (judge: PanelJudge) => {
    try {
      await deleteJudge(competitionId, judge.id);
      setJudges((prev) => prev?.filter((j) => j.id !== judge.id) ?? prev);
    } catch {
      onError('Не вдалося видалити суддю. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  return (
    <section className={styles.panel}>
      <p className={styles.note}>
        Суддя отримує тимчасовий пароль на свій email і має доступ лише до
        цього конкурсу — може переглядати заявки і виставляти оцінки від 1 до
        10.
      </p>

      {loading && <p className={styles.status}>Завантаження...</p>}

      {!loading && judges && judges.length > 0 && (
        <ul className={styles.judges}>
          {judges.map((judge) => (
            <li key={judge.id} className={styles.judge}>
              <div className={styles.judgeRow}>
                <input
                  className={styles.input}
                  type="text"
                  value={judge.name}
                  readOnly
                  aria-label="Ім'я судді"
                />
                <input
                  className={styles.input}
                  type="email"
                  value={judge.email}
                  readOnly
                  aria-label="Email судді"
                />
                {canManage && (
                  <button
                    type="button"
                    className={styles.btnLink}
                    aria-label={`Видалити суддю ${judge.name}`}
                    onClick={() => setPendingDelete(judge)}
                  >
                    Видалити
                  </button>
                )}
              </div>
              {judge.tempPassword && (
                <p className={styles.pass}>
                  {judge.emailSent
                    ? 'лист із паролем надіслано на email. '
                    : 'лист не надіслано — перекажіть пароль самі. '}
                  тимчасовий пароль: <code>{judge.tempPassword}</code> — збережіть
                  його зараз, більше він ніде не показується
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {!loading && judges && judges.length === 0 && (
        <p className={styles.status}>Суддів ще не додано</p>
      )}

      {canManage && (
        <form className={styles.addJudge} onSubmit={handleAdd}>
          <input
            className={styles.input}
            type="text"
            placeholder="Ім'я судді"
            aria-label="Ім'я нового судді"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            className={styles.input}
            type="email"
            placeholder="email судді"
            aria-label="Email нового судді"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className={styles.btnPrimary} disabled={submitting}>
            {submitting ? 'Додавання…' : 'Додати'}
          </button>
        </form>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити суддю?"
        description={
          pendingDelete
            ? `Видалити «${pendingDelete.name}» зі списку суддів? Доступ буде втрачено одразу.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? handleDelete(pendingDelete) : undefined)}
      />
    </section>
  );
}
