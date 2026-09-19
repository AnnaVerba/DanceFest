import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import TemplateImportModal from './TemplateImportModal';
import SpecialCategoryModal from '../nominations/SpecialCategoryModal';
import type { SpecialNominationDraft } from '../nominations/SpecialCategoryModal';
import NominationFilterBar from './nominationSelection/NominationFilterBar';
import NominationBulkBar from './nominationSelection/NominationBulkBar';
import NominationPager from './nominationSelection/NominationPager';
import { useNominationSelection } from './nominationSelection/useNominationSelection';
import { useNominationsPage } from './nominationSelection/useNominationsPage';
import {
  NOTHING_FOUND_MESSAGE,
  SELECT_NOMINATION_ARIA_PREFIX,
} from './nominationSelection/nominationFilters.constants';
import { LEAGUE_CATEGORY_TYPE, getCategories } from '../../lib/categories';
import type { Category } from '../../lib/categories';
import {
  createNomination,
  createNominationsBulk,
  deleteNomination,
  setImprovisationBulk,
  updateNomination,
} from '../../lib/nominations';
import type {
  Nomination,
  NominationBulkSelector,
  NominationInput,
} from '../../lib/nominations';
import { refreshNominations } from '../../lib/nominationsCache';
import {
  DURATION_UNSET_PLACEHOLDER,
  NOMINATIONS_PAGE_SIZE,
} from '../../lib/nominations.constants';
import { formatDuration, parseDuration, pluralExits } from '../../lib/duration';
import {
  NOMINATION_LEAGUE_ARIA_LABEL,
  NOMINATION_LEAGUE_PLACEHOLDER,
  NOMINATION_LEAGUE_SELECT_REQUIRED_MESSAGE,
} from '../../lib/nominationLeague.constants';
import { queryKeys } from '../../lib/queryKeys';
import { REFERENCE_STALE_TIME_MS } from '../../lib/queryClient.constants';
import styles from './NominationsPanel.module.css';

// Stable reference so useMemo below doesn't see a "new" array on every
// render while the query has no data yet.
const EMPTY_CATEGORIES: Category[] = [];
const EMPTY_NOMINATIONS: Nomination[] = [];

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
  const [leagueId, setLeagueId] = useState('');
  const [specialOpen, setSpecialOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Nomination | null>(null);
  const [editing, setEditing] = useState<Record<string, EditState>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const selection = useNominationSelection(NOMINATIONS_PAGE_SIZE);
  const nominationsQuery = useNominationsPage(competitionId, selection);
  const rows = nominationsQuery.data?.rows ?? EMPTY_NOMINATIONS;
  const total = nominationsQuery.data?.total ?? 0;
  const loading = nominationsQuery.isLoading;
  const competitionHasNoNominations =
    nominationsQuery.isSuccess && total === 0 && !selection.hasActiveFilter;

  useEffect(() => {
    if (nominationsQuery.isError) onError('Не вдалося завантажити номінації.');
  }, [nominationsQuery.isError, onError]);

  // Same reference cache as everywhere else categories are picked from —
  // also powers the style/league/age filters below, so it's fetched
  // whenever the panel can manage nominations, not just while the modal
  // is open.
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => getCategories(),
    enabled: canManage,
    staleTime: REFERENCE_STALE_TIME_MS,
  });
  const categories = categoriesQuery.data ?? EMPTY_CATEGORIES;

  const leaguesQuery = useQuery({
    queryKey: queryKeys.categories(LEAGUE_CATEGORY_TYPE),
    queryFn: () => getCategories(LEAGUE_CATEGORY_TYPE),
    enabled: canManage,
    staleTime: REFERENCE_STALE_TIME_MS,
  });
  const leagues = leaguesQuery.data ?? [];

  useEffect(() => {
    if (canManage && categoriesQuery.isError) {
      onError('Не вдалося завантажити довідник категорій.');
    }
  }, [canManage, categoriesQuery.isError, onError]);

  const createNominationMutation = useMutation({
    mutationFn: (input: NominationInput) => createNomination(competitionId, input),
    onSuccess: () => refreshNominations(queryClient, competitionId),
  });

  const createNominationsBulkMutation = useMutation({
    mutationFn: (inputs: NominationInput[]) =>
      createNominationsBulk(competitionId, inputs),
    onSuccess: () => refreshNominations(queryClient, competitionId),
  });

  const updateNominationMutation = useMutation({
    mutationFn: (args: { id: string; input: Partial<NominationInput> }) =>
      updateNomination(competitionId, args.id, args.input),
    onSuccess: () => refreshNominations(queryClient, competitionId),
  });

  const setImprovisationMutation = useMutation({
    mutationFn: (args: {
      selector: NominationBulkSelector;
      allowsImprovisation: boolean;
    }) => setImprovisationBulk(competitionId, args.selector, args.allowsImprovisation),
    onSuccess: () => {
      refreshNominations(queryClient, competitionId);
      selection.clearSelection();
    },
  });

  const deleteNominationMutation = useMutation({
    mutationFn: (nominationId: string) => deleteNomination(competitionId, nominationId),
    onSuccess: (_data, nominationId) => {
      refreshNominations(queryClient, competitionId);
      selection.deselect(nominationId);
    },
  });

  // The server orders special categories first, so each page splits cleanly.
  const { regular, special } = useMemo(
    () => ({
      regular: rows.filter((n) => !n.isSpecial),
      special: rows.filter((n) => n.isSpecial),
    }),
    [rows],
  );

  const handleBulkImprovisation = async (allowsImprovisation: boolean) => {
    if (selection.selectedCount(total) === 0 || setImprovisationMutation.isPending) return;
    try {
      await setImprovisationMutation.mutateAsync({
        selector: selection.buildBulkSelector(),
        allowsImprovisation,
      });
    } catch {
      onError('Не вдалося оновити ознаку імпровізації. Спробуйте ще раз.');
    }
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || createNominationMutation.isPending) return;
    if (!leagueId) {
      onError(NOMINATION_LEAGUE_SELECT_REQUIRED_MESSAGE);
      return;
    }

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
        categoryIds: [leagueId],
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

    // A duration sent back unchanged would still mark it as set by hand and
    // stop league-timing changes from reaching this nomination (BUG-10).
    const durationChanged = seconds !== nomination.durationLimitSeconds;

    setSavingId(nomination.id);
    try {
      await updateNominationMutation.mutateAsync({
        id: nomination.id,
        input: {
          price: state.price.trim() === '' ? undefined : Number(state.price),
          durationLimitSeconds: durationChanged ? (seconds ?? undefined) : undefined,
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
        {canManage && (
          <input
            type="checkbox"
            className={styles.rowCheckbox}
            aria-label={`${SELECT_NOMINATION_ARIA_PREFIX} ${nomination.name}`}
            checked={selection.isSelected(nomination.id)}
            disabled={selection.allFilteredSelected}
            onChange={() => selection.toggleSelected(nomination.id)}
          />
        )}
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
            {nomination.allowsImprovisation && (
              <span className={styles.badgeImprov}>імпровізація</span>
            )}
            {nomination.durationOverridden && (
              <span
                className={styles.badge}
                title="Тривалість задана вручну — зміна тривалості ліги її не торкнеться"
              >
                тривалість вручну
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
              placeholder={DURATION_UNSET_PLACEHOLDER}
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
            <select
              className={styles.input}
              aria-label={NOMINATION_LEAGUE_ARIA_LABEL}
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
              required
            >
              <option value="">{NOMINATION_LEAGUE_PLACEHOLDER}</option>
              {leagues.map((league) => (
                <option key={league.id} value={league.id}>
                  {league.name}
                </option>
              ))}
            </select>
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

      {competitionHasNoNominations && (
        <div className={styles.empty}>
          <p className={styles.emptyText}>
            Для цього конкурсу ще не сформовано номінацій. Додайте їх вручну або
            скопіюйте набір із шаблону категорій.
          </p>
          {canManage && (
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() => setImportOpen(true)}
            >
              Скопіювати із шаблону
            </button>
          )}
        </div>
      )}

      {canManage && nominationsQuery.isSuccess && !competitionHasNoNominations && (
        <NominationFilterBar selection={selection} />
      )}

      {nominationsQuery.isSuccess && !competitionHasNoNominations && total === 0 && (
        <p className={styles.status}>{NOTHING_FOUND_MESSAGE}</p>
      )}

      {canManage && (
        <NominationBulkBar selection={selection} total={total}>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={setImprovisationMutation.isPending}
            onClick={() => void handleBulkImprovisation(true)}
          >
            Встановити «Імпровізація»
          </button>
          <button
            type="button"
            className={styles.btnSecondary}
            disabled={setImprovisationMutation.isPending}
            onClick={() => void handleBulkImprovisation(false)}
          >
            Зняти «Імпровізація»
          </button>
        </NominationBulkBar>
      )}

      {special.length > 0 && (
        <>
          <h3 className={styles.groupTitle}>Спеціальні категорії</h3>
          <ul className={styles.rows}>{special.map(renderRow)}</ul>
        </>
      )}

      {regular.length > 0 && (
        <>
          <h3 className={styles.groupTitle}>Номінації</h3>
          <ul className={styles.rows}>{regular.map(renderRow)}</ul>
        </>
      )}

      <NominationPager selection={selection} total={total} />

      {importOpen && (
        <TemplateImportModal
          competitionId={competitionId}
          onClose={() => setImportOpen(false)}
          onImported={() => {
            refreshNominations(queryClient, competitionId);
            setImportOpen(false);
          }}
        />
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
