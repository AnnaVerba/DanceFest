import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import SpecialCategoryModal from '../nominations/SpecialCategoryModal';
import type { SpecialNominationDraft } from '../nominations/SpecialCategoryModal';
import { getCategories } from '../../lib/categories';
import type { Category } from '../../lib/categories';
import {
  createNomination,
  createNominationsBulk,
  deleteNomination,
  getNominations,
  updateNomination,
} from '../../lib/nominations';
import type { Nomination, NominationInput } from '../../lib/nominations';
import { formatDuration, parseDuration, pluralExits } from '../../lib/duration';
import { queryKeys } from '../../lib/queryKeys';
import { REFERENCE_STALE_TIME_MS } from '../../lib/queryClient.constants';
import styles from './NominationsPanel.module.css';

interface NominationsPanelProps {
  competitionId: string;
  canManage: boolean;
  onError: (message: string) => void;
}

interface EditState {
  price: string;
  duration: string;
}

export default function NominationsPanel({
  competitionId,
  canManage,
  onError,
}: NominationsPanelProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('');
  const [specialOpen, setSpecialOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Nomination | null>(null);
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const nominationsQuery = useQuery({
    queryKey: queryKeys.nominations(competitionId),
    queryFn: () => getNominations(competitionId),
  });
  const nominations = nominationsQuery.data ?? null;
  const loading = nominationsQuery.isLoading;

  useEffect(() => {
    if (nominationsQuery.isError) onError('Не вдалося завантажити номінації.');
  }, [nominationsQuery.isError, onError]);

  // Same reference cache as everywhere else categories are picked from —
  // opening this modal after visiting, say, the competition wizard is free.
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => getCategories(),
    enabled: specialOpen,
    staleTime: REFERENCE_STALE_TIME_MS,
  });
  const categories = categoriesQuery.data ?? [];

  useEffect(() => {
    if (specialOpen && categoriesQuery.isError) {
      onError('Не вдалося завантажити довідник категорій.');
    }
  }, [specialOpen, categoriesQuery.isError, onError]);

  const createNominationMutation = useMutation({
    mutationFn: (input: NominationInput) => createNomination(competitionId, input),
    onSuccess: (created) => {
      queryClient.setQueryData<Nomination[]>(
        queryKeys.nominations(competitionId),
        (prev) => [...(prev ?? []), created],
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nominations(competitionId),
      });
    },
  });

  const createNominationsBulkMutation = useMutation({
    mutationFn: (inputs: NominationInput[]) =>
      createNominationsBulk(competitionId, inputs),
    onSuccess: (created) => {
      queryClient.setQueryData<Nomination[]>(
        queryKeys.nominations(competitionId),
        (prev) => [...(prev ?? []), ...created],
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nominations(competitionId),
      });
    },
  });

  const updateNominationMutation = useMutation({
    mutationFn: (args: { id: string; input: Partial<NominationInput> }) =>
      updateNomination(competitionId, args.id, args.input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Nomination[]>(
        queryKeys.nominations(competitionId),
        (prev) => prev?.map((n) => (n.id === updated.id ? updated : n)),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nominations(competitionId),
      });
    },
  });

  const deleteNominationMutation = useMutation({
    mutationFn: (nominationId: string) => deleteNomination(competitionId, nominationId),
    onSuccess: (_data, nominationId) => {
      queryClient.setQueryData<Nomination[]>(
        queryKeys.nominations(competitionId),
        (prev) => prev?.filter((n) => n.id !== nominationId),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nominations(competitionId),
      });
    },
  });

  const { regular, special } = useMemo(() => {
    const list = nominations ?? [];
    return {
      regular: list.filter((n) => !n.isSpecial),
      special: list.filter((n) => n.isSpecial),
    };
  }, [nominations]);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createNominationMutation.isPending) return;

    const seconds = parseDuration(duration);
    if (duration.trim() !== '' && seconds === null) {
      onError('Некоректна тривалість. Пишіть «2:30» або «150».');
      return;
    }

    try {
      await createNominationMutation.mutateAsync({
        name,
        price: price.trim() === '' ? undefined : Number(price),
        durationLimitSeconds: seconds ?? undefined,
      });
      setName('');
      setPrice('');
      setDuration('');
    } catch {
      onError('Не вдалося додати номінацію. Спробуйте ще раз.');
    }
  };

  const handleAddSpecial = async (drafts: SpecialNominationDraft[]) => {
    try {
      await createNominationsBulkMutation.mutateAsync(
        drafts.map((d) => ({
          name: d.name,
          price: d.price.trim() === '' ? undefined : Number(d.price),
          allowsImprovisation: d.allowsImprovisation,
          categoryIds: d.categoryIds,
          isSpecial: d.isSpecial,
          exitMode: d.exitMode,
          programLimits: d.programLimits,
        })),
      );
    } catch {
      onError('Не вдалося створити спеціальну категорію. Спробуйте ще раз.');
    }
  };

  const editStateOf = (nomination: Nomination): EditState =>
    editing[nomination.id] ?? {
      price: nomination.price === null ? '' : String(nomination.price),
      duration: formatDuration(nomination.durationLimitSeconds),
    };

  const patchEdit = (id: string, patch: Partial<EditState>, current: EditState) =>
    setEditing((prev) => ({ ...prev, [id]: { ...current, ...patch } }));

  const handleSave = async (nomination: Nomination) => {
    const state = editing[nomination.id];
    if (!state || savingId) return;

    const seconds = parseDuration(state.duration);
    if (state.duration.trim() !== '' && seconds === null) {
      onError('Некоректна тривалість. Пишіть «2:30» або «150».');
      return;
    }
    if (state.price.trim() !== '' && !(Number(state.price) >= 0)) {
      onError('Некоректна ціна.');
      return;
    }

    setSavingId(nomination.id);
    try {
      await updateNominationMutation.mutateAsync({
        id: nomination.id,
        input: {
          price: state.price.trim() === '' ? undefined : Number(state.price),
          durationLimitSeconds: seconds ?? undefined,
        },
      });
      setEditing((prev) => {
        const next = { ...prev };
        delete next[nomination.id];
        return next;
      });
    } catch {
      onError('Не вдалося зберегти номінацію. Спробуйте ще раз.');
    } finally {
      setSavingId(null);
    }
  };

  const handleDelete = async (nomination: Nomination) => {
    try {
      await deleteNominationMutation.mutateAsync(nomination.id);
    } catch {
      onError('Не вдалося видалити номінацію. Спробуйте ще раз.');
    } finally {
      setPendingDelete(null);
    }
  };

  const renderRow = (nomination: Nomination) => {
    const state = editStateOf(nomination);
    const dirty = editing[nomination.id] !== undefined;
    const exits = nomination.exits;

    return (
      <li key={nomination.id} className={styles.row}>
        <div className={styles.rowMain}>
          <div className={styles.rowName}>
            {nomination.name}
            {nomination.isSpecial && (
              <span className={styles.badge}>
                {nomination.exitMode === 'single'
                  ? 'один вихід'
                  : `${exits.length} ${pluralExits(exits.length)}`}
              </span>
            )}
          </div>

          {exits.length > 1 && (
            <ul className={styles.exits}>
              {exits.map((exit) => (
                <li key={exit.programId ?? exit.label}>
                  {exit.programName}
                  {exit.durationLimitSeconds !== null && (
                    <span className={styles.exitLimit}>
                      до {formatDuration(exit.durationLimitSeconds)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}

          {nomination.isSpecial && exits.length === 1 && nomination.programs.length > 1 && (
            <div className={styles.rowHint}>
              Програми підряд: {nomination.programs.map((p) => p.name).join(', ')}
            </div>
          )}
        </div>

        {canManage ? (
          <div className={styles.rowActions}>
            <input
              className={styles.inputSm}
              type="number"
              min="0"
              step="10"
              placeholder="₴"
              aria-label={`Ціна номінації ${nomination.name}`}
              value={state.price}
              onChange={(e) =>
                patchEdit(nomination.id, { price: e.target.value }, state)
              }
            />
            <input
              className={styles.inputSm}
              type="text"
              inputMode="numeric"
              placeholder="2:30"
              aria-label={`Тривалість номінації ${nomination.name}`}
              disabled={nomination.exitMode === 'per_program'}
              value={
                nomination.exitMode === 'per_program'
                  ? ''
                  : state.duration ||
                    formatDuration(exits[0]?.durationLimitSeconds ?? null)
              }
              onChange={(e) =>
                patchEdit(nomination.id, { duration: e.target.value }, state)
              }
            />
            <button
              type="button"
              className={styles.btnLink}
              disabled={!dirty || savingId === nomination.id}
              onClick={() => void handleSave(nomination)}
            >
              {savingId === nomination.id ? 'Збереження…' : 'Зберегти'}
            </button>
            <button
              type="button"
              className={styles.btnLinkDanger}
              aria-label={`Видалити номінацію ${nomination.name}`}
              onClick={() => setPendingDelete(nomination)}
            >
              Видалити
            </button>
          </div>
        ) : (
          <div className={styles.rowMeta}>
            {nomination.price !== null && <span>{nomination.price} ₴</span>}
            {exits[0]?.durationLimitSeconds !== null &&
              exits.length === 1 &&
              exits[0] && <span>до {formatDuration(exits[0].durationLimitSeconds)}</span>}
          </div>
        )}
      </li>
    );
  };

  return (
    <section className={styles.panel}>
      <p className={styles.note}>
        Номінація — це те, на що подають заявку. Звичайна дає один вихід на
        сцену. Спеціальна категорія («Кубок», «Корона», батл) тримає кілька
        програм всередині й може давати окремий вихід на кожну з них.
      </p>

      {canManage && (
        <>
          <form className={styles.add} onSubmit={handleAdd}>
            <input
              className={styles.input}
              type="text"
              placeholder="Назва номінації (напр. Соло · Діти · Дебют · Фрі Денс)"
              aria-label="Назва номінації"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className={styles.input}
              type="number"
              min="0"
              step="10"
              placeholder="Ціна, ₴"
              aria-label="Ціна номінації"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <input
              className={styles.input}
              type="text"
              inputMode="numeric"
              placeholder="Тривалість, 2:30"
              aria-label="Тривалість номінації"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={createNominationMutation.isPending}
            >
              {createNominationMutation.isPending ? 'Додавання…' : 'Додати'}
            </button>
          </form>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => setSpecialOpen(true)}
          >
            + Додати спеціальну категорію
          </button>
        </>
      )}

      {loading && <p className={styles.status}>Завантаження...</p>}

      {!loading && nominations && nominations.length === 0 && (
        <p className={styles.empty}>
          Для цього конкурсу ще не сформовано номінацій. Додайте їх вручну або
          скопіюйте набір із шаблону категорій.
        </p>
      )}

      {special.length > 0 && (
        <>
          <h3 className={styles.groupTitle}>
            Спеціальні категорії <span className={styles.count}>{special.length}</span>
          </h3>
          <ul className={styles.rows}>{special.map(renderRow)}</ul>
        </>
      )}

      {regular.length > 0 && (
        <>
          <h3 className={styles.groupTitle}>
            Номінації <span className={styles.count}>{regular.length}</span>
          </h3>
          <ul className={styles.rows}>{regular.map(renderRow)}</ul>
        </>
      )}

      <SpecialCategoryModal
        open={specialOpen}
        categories={categories}
        submitLabel="Додати до конкурсу"
        onClose={() => setSpecialOpen(false)}
        onCategoryCreated={(category) => {
          const prev = queryClient.getQueryData<Category[]>(queryKeys.categories());
          if (!prev) {
            void queryClient.invalidateQueries({ queryKey: queryKeys.categories() });
            return;
          }
          queryClient.setQueryData<Category[]>(queryKeys.categories(), (data) =>
            data?.some((c) => c.id === category.id) ? data : [...(data ?? []), category],
          );
        }}
        onSubmit={(drafts) => void handleAddSpecial(drafts)}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити номінацію?"
        description={
          pendingDelete
            ? `Видалити «${pendingDelete.name}»? Уже подані заявки лишаться, але втратять зв'язок із номінацією. Ця дія незворотна.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => (pendingDelete ? void handleDelete(pendingDelete) : undefined)}
      />
    </section>
  );
}
