import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getOverages } from '../../lib/overages';
import type { OverageEntry } from '../../lib/overages';
import { updateEntryExtraTime, EXTRA_TIME_SECONDS_OPTIONS } from '../../lib/entries';
import type { ExtraTimeSeconds } from '../../lib/entries';
import { formatDuration } from '../../lib/duration';
import { queryKeys } from '../../lib/queryKeys';
import { OVERAGES_STALE_TIME_MS } from '../../lib/queryClient.constants';
import styles from './OveragesPanel.module.css';

interface OveragesPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

interface RowDraft {
  purchasedSec: ExtraTimeSeconds;
  fee: string;
}

function defaultDraft(item: OverageEntry): RowDraft {
  return {
    purchasedSec: item.purchasedSec === 60 ? 60 : 30,
    fee: item.purchasedSec > 0 ? String(item.extraFee) : '',
  };
}

export default function OveragesPanel({
  competitionId,
  canManage,
  onError,
}: OveragesPanelProps) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const overagesQuery = useQuery({
    queryKey: queryKeys.overages(competitionId),
    queryFn: () => getOverages(competitionId),
    staleTime: OVERAGES_STALE_TIME_MS,
  });
  const items = overagesQuery.data?.items ?? null;
  const loading = overagesQuery.isLoading;

  useEffect(() => {
    if (overagesQuery.isError) onError('Не вдалося завантажити перевищення часу.');
  }, [overagesQuery.isError, onError]);

  // Money, so no optimistic update — save waits for the server, then every
  // cache this figure feeds into is invalidated (see
  // .claude/prompt-caching-strategy.md, "Доплати за час і переліміти" +
  // the entries-mutation rule): this panel's own list, the entries list
  // (purchasedExtraSeconds/extraFee live on the same Entry), and the
  // performance-program views under the shared 'timing' key prefix, since
  // an on-stage time change is input to their auto-calculated durations.
  const updateExtraTimeMutation = useMutation({
    mutationFn: (args: { entryId: string; purchasedSec: ExtraTimeSeconds; fee: number }) =>
      updateEntryExtraTime(competitionId, args.entryId, {
        purchasedSec: args.purchasedSec,
        fee: args.fee,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.overages(competitionId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.entries(competitionId) });
      void queryClient.invalidateQueries({ queryKey: ['timing', competitionId] });
    },
  });

  const draftFor = (item: OverageEntry): RowDraft =>
    drafts[item.entryId] ?? defaultDraft(item);

  const setDraft = (item: OverageEntry, patch: Partial<RowDraft>) => {
    setDrafts((prev) => ({
      ...prev,
      [item.entryId]: { ...(prev[item.entryId] ?? defaultDraft(item)), ...patch },
    }));
  };

  const handleSave = async (item: OverageEntry) => {
    const draft = draftFor(item);
    const fee = Number(draft.fee);
    if (draft.fee.trim() === '' || !Number.isFinite(fee) || fee < 0) {
      onError('Вкажіть коректну суму доплати.');
      return;
    }
    setSavingId(item.entryId);
    try {
      await updateExtraTimeMutation.mutateAsync({
        entryId: item.entryId,
        purchasedSec: draft.purchasedSec,
        fee,
      });
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[item.entryId];
        return next;
      });
    } catch {
      onError('Не вдалося зберегти доплату. Спробуйте ще раз.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className={styles.panel}>
      <p className={styles.intro}>
        Заявки, чия виміряна тривалість перевищує ліміт. Без зафіксованої
        доплати перевищення лишається попередженням і не блокує виступ.
      </p>

      {loading && <p className={styles.status}>Завантаження...</p>}

      {!loading && items && items.length === 0 && (
        <p className={styles.empty}>Перевищень ліміту часу немає.</p>
      )}

      {!loading && items && items.length > 0 && (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th scope="col">№</th>
                <th scope="col">Виступ</th>
                <th scope="col">Ліга</th>
                <th scope="col">Ліміт</th>
                <th scope="col">Тривалість</th>
                <th scope="col">Перевищення</th>
                <th scope="col">Статус</th>
                {canManage && (
                  <>
                    <th scope="col">Докуплено</th>
                    <th scope="col">Доплата, грн</th>
                    <th scope="col" className={styles.colActions}>
                      <span hidden>Дії</span>
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const draft = draftFor(item);
                const isPaid = item.purchasedSec > 0;
                const dirty =
                  draft.purchasedSec !== item.purchasedSec ||
                  draft.fee !== (isPaid ? String(item.extraFee) : '');
                const isSaving = savingId === item.entryId;

                return (
                  <tr key={item.entryId}>
                    <td className={styles.num}>{item.number}</td>
                    <td className={styles.name}>{item.dancerName}</td>
                    <td>{item.league}</td>
                    <td>{formatDuration(item.limitSec)}</td>
                    <td>{formatDuration(item.durationSec)}</td>
                    <td className={styles.overage}>+{formatDuration(item.overageSec)}</td>
                    <td>
                      <span
                        className={
                          isPaid
                            ? `${styles.badge} ${styles.badgePaid}`
                            : `${styles.badge} ${styles.badgeWarning}`
                        }
                      >
                        {isPaid ? `+${item.purchasedSec} с оплачено` : 'Попередження'}
                      </span>
                    </td>
                    {canManage && (
                      <>
                        <td>
                          <select
                            className={styles.field}
                            aria-label={`Докуплений час для №${item.number}`}
                            value={draft.purchasedSec}
                            disabled={isSaving}
                            onChange={(e) =>
                              setDraft(item, {
                                purchasedSec: Number(
                                  e.target.value,
                                ) as ExtraTimeSeconds,
                              })
                            }
                          >
                            {EXTRA_TIME_SECONDS_OPTIONS.map((sec) => (
                              <option key={sec} value={sec}>
                                +{sec} с
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className={`${styles.field} ${styles.feeInput}`}
                            type="number"
                            min="0"
                            step="1"
                            inputMode="numeric"
                            aria-label={`Сума доплати для №${item.number}`}
                            placeholder="0"
                            value={draft.fee}
                            disabled={isSaving}
                            onChange={(e) => setDraft(item, { fee: e.target.value })}
                          />
                        </td>
                        <td className={styles.colActions}>
                          <button
                            className={styles.btnSm}
                            type="button"
                            disabled={!dirty || isSaving}
                            onClick={() => handleSave(item)}
                          >
                            {isSaving ? 'Збереження…' : 'Зберегти'}
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
