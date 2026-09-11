import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import { createJudge, deleteJudge, getJudges } from '../../lib/judges';
import type { Judge } from '../../lib/judges';
import { queryKeys } from '../../lib/queryKeys';
import styles from './JudgesPanel.module.css';

interface JudgesPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

// Shown once, right after creation, then gone for good — kept out of the
// shared judges cache (see createJudgeMutation) so a window-focus refetch
// or a remount can't make it reappear or vanish out from under the admin.
interface TempCredential {
  judgeId: string;
  password: string;
  emailSent: boolean;
}

export default function JudgesPanel({
  competitionId,
  canManage,
  onError,
}: JudgesPanelProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Judge | null>(null);
  const [tempCredential, setTempCredential] = useState<TempCredential | null>(
    null,
  );

  const judgesQuery = useQuery({
    queryKey: queryKeys.judges(competitionId),
    queryFn: () => getJudges(competitionId),
  });
  const judges = judgesQuery.data ?? null;
  const loading = judgesQuery.isLoading;

  useEffect(() => {
    if (judgesQuery.isError) onError('Не вдалося завантажити суддів.');
  }, [judgesQuery.isError, onError]);

  // The cache holds only persistent Judge fields. tempPassword/emailSent
  // come back solely on the create response, so they go to component state
  // instead — mixing them into the cached list would make them vanish on
  // any refetch (window focus, 30s staleTime) or reappear on a remount.
  const createJudgeMutation = useMutation({
    mutationFn: () => createJudge(competitionId, name, email),
    onSuccess: ({ tempPassword, emailSent, ...judge }) => {
      queryClient.setQueryData<Judge[]>(queryKeys.judges(competitionId), (prev) => [
        ...(prev ?? []),
        judge,
      ]);
      setTempCredential({ judgeId: judge.id, password: tempPassword, emailSent });
    },
  });

  const deleteJudgeMutation = useMutation({
    mutationFn: (judgeId: string) => deleteJudge(competitionId, judgeId),
    onSuccess: (_data, judgeId) => {
      queryClient.setQueryData<Judge[]>(
        queryKeys.judges(competitionId),
        (prev) => prev?.filter((j) => j.id !== judgeId),
      );
      setTempCredential((current) =>
        current?.judgeId === judgeId ? null : current,
      );
    },
  });

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || createJudgeMutation.isPending) return;
    try {
      await createJudgeMutation.mutateAsync();
      setName('');
      setEmail('');
    } catch {
      onError('Не вдалося додати суддю. Перевірте дані та спробуйте ще раз.');
    }
  };

  const handleDelete = async (judge: Judge) => {
    try {
      await deleteJudgeMutation.mutateAsync(judge.id);
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
              {tempCredential?.judgeId === judge.id && (
                <p className={styles.pass}>
                  {tempCredential.emailSent
                    ? 'лист із паролем надіслано на email. '
                    : 'лист не надіслано — перекажіть пароль самі. '}
                  тимчасовий пароль: <code>{tempCredential.password}</code> —
                  збережіть його зараз, більше він ніде не показується{' '}
                  <button
                    type="button"
                    className={styles.btnLink}
                    onClick={() => setTempCredential(null)}
                  >
                    Приховати
                  </button>
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
          <button
            type="submit"
            className={styles.btnPrimary}
            disabled={createJudgeMutation.isPending}
          >
            {createJudgeMutation.isPending ? 'Додавання…' : 'Додати'}
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
