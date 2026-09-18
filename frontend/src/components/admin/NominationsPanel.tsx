import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ConfirmDialog from './ConfirmDialog';
import TemplateImportModal from './TemplateImportModal';
import SpecialCategoryModal from '../nominations/SpecialCategoryModal';
import type { SpecialNominationDraft } from '../nominations/SpecialCategoryModal';
import {
  AGE_CATEGORY_TYPE,
  LEAGUE_CATEGORY_TYPE,
  getCategories,
} from '../../lib/categories';
import type { Category } from '../../lib/categories';
import {
  createNomination,
  createNominationsBulk,
  deleteNomination,
  getNominations,
  setImprovisationBulk,
  updateNomination,
} from '../../lib/nominations';
import type {
  Nomination,
  NominationBulkSelector,
  NominationInput,
} from '../../lib/nominations';
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
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filterStyleId, setFilterStyleId] = useState('');
  const [filterLeagueId, setFilterLeagueId] = useState('');
  const [filterAgeId, setFilterAgeId] = useState('');
  const [filterQuery, setFilterQuery] = useState('');

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
  const styleOptions = useMemo(
    () => categories.filter((c) => c.type === 'style'),
    [categories],
  );
  const ageOptions = useMemo(
    () => categories.filter((c) => c.type === AGE_CATEGORY_TYPE),
    [categories],
  );

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

  const setImprovisationMutation = useMutation({
    mutationFn: (args: {
      selector: NominationBulkSelector;
      allowsImprovisation: boolean;
    }) => setImprovisationBulk(competitionId, args.selector, args.allowsImprovisation),
    onSuccess: (updated) => {
      const byId = new Map(updated.map((n) => [n.id, n]));
      queryClient.setQueryData<Nomination[]>(
        queryKeys.nominations(competitionId),
        (prev) => prev?.map((n) => byId.get(n.id) ?? n),
      );
      void queryClient.invalidateQueries({
        queryKey: queryKeys.nominations(competitionId),
      });
      setSelectedIds(new Set());
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

  const activeFilterCategoryIds = useMemo(
    () => [filterStyleId, filterLeagueId, filterAgeId].filter((id) => id !== ''),
    [filterStyleId, filterLeagueId, filterAgeId],
  );
  const hasActiveFilter =
    activeFilterCategoryIds.length > 0 || filterQuery.trim() !== '';

  const filtered = useMemo(() => {
    const list = nominations ?? [];
    const q = filterQuery.trim().toLowerCase();
    return list.filter((n) => {
      if (activeFilterCategoryIds.some((id) => !n.categoryIds.includes(id))) {
        return false;
      }
      return q === '' || n.name.toLowerCase().includes(q);
    });
  }, [nominations, activeFilterCategoryIds, filterQuery]);

  const { regular, special } = useMemo(
    () => ({
      regular: filtered.filter((n) => !n.isSpecial),
      special: filtered.filter((n) => n.isSpecial),
    }),
    [filtered],
  );

  // Filters change what's selectable, so every filter change drops the
  // current selection rather than leave ids selected that are no longer in
  // view.
  const setFilterStyle = (id: string) => {
    setFilterStyleId(id);
    setSelectedIds(new Set());
  };
  const setFilterLeague = (id: string) => {
    setFilterLeagueId(id);
    setSelectedIds(new Set());
  };
  const setFilterAge = (id: string) => {
    setFilterAgeId(id);
    setSelectedIds(new Set());
  };
  const setFilterName = (q: string) => {
    setFilterQuery(q);
    setSelectedIds(new Set());
  };
  const clearFilters = () => {
    setFilterStyleId('');
    setFilterLeagueId('');
    setFilterAgeId('');
    setFilterQuery('');
    setSelectedIds(new Set());
  };

  const filteredIds = useMemo(() => filtered.map((n) => n.id), [filtered]);
  const allSelected =
    filteredIds.length > 0 && filteredIds.every((id) => selectedIds.has(id));

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleSelectAll = () =>
    setSelectedIds((prev) =>
      prev.size === filteredIds.length ? new Set() : new Set(filteredIds),
    );

  const handleBulkImprovisation = async (allowsImprovisation: boolean) => {
    if (selectedIds.size === 0 || setImprovisationMutation.isPending) return;

    // Selecting everything the current filter shows is exactly the case a
    // filter-based request replaces: no need to ship hundreds of ids when
    // the filter already identifies the same set on the server.
    const isFullFilteredSelection =
      selectedIds.size === filteredIds.length &&
      filteredIds.every((id) => selectedIds.has(id));

    const selector: NominationBulkSelector = isFullFilteredSelection
      ? {
          filter: {
            categoryIds:
              activeFilterCategoryIds.length > 0 ? activeFilterCategoryIds : undefined,
            q: filterQuery.trim() || undefined,
          },
        }
      : { nominationIds: [...selectedIds] };

    try {
      await setImprovisationMutation.mutateAsync({ selector, allowsImprovisation });
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
        {canManage && (
          <input
            type="checkbox"
            className={styles.rowCheckbox}
            aria-label={`Обрати номінацію ${nomination.name}`}
            checked={selectedIds.has(nomination.id)}
            onChange={() => toggleSelected(nomination.id)}
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

      {!loading && nominations && nominations.length === 0 && (
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

      {canManage && nominations && nominations.length > 0 && (
        <div className={styles.filterBar}>
          <select
            className={styles.inputSm}
            aria-label="Фільтр за стилем"
            value={filterStyleId}
            onChange={(e) => setFilterStyle(e.target.value)}
          >
            <option value="">Стиль: усі</option>
            {styleOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={styles.inputSm}
            aria-label="Фільтр за лігою"
            value={filterLeagueId}
            onChange={(e) => setFilterLeague(e.target.value)}
          >
            <option value="">Ліга: усі</option>
            {leagues.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            className={styles.inputSm}
            aria-label="Фільтр за віком"
            value={filterAgeId}
            onChange={(e) => setFilterAge(e.target.value)}
          >
            <option value="">Вік: усі</option>
            {ageOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className={styles.input}
            type="text"
            placeholder="Пошук за назвою"
            aria-label="Пошук номінацій за назвою"
            value={filterQuery}
            onChange={(e) => setFilterName(e.target.value)}
          />
          {hasActiveFilter && (
            <button type="button" className={styles.btnLink} onClick={clearFilters}>
              Скинути фільтр
            </button>
          )}
        </div>
      )}

      {!loading &&
        nominations &&
        nominations.length > 0 &&
        filtered.length === 0 && (
          <p className={styles.status}>Нічого не знайдено за обраними фільтрами.</p>
        )}

      {canManage && filteredIds.length > 0 && (
        <div className={styles.bulkBar}>
          <label className={styles.bulkSelectAll}>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} />
            Обрати всі відфільтровані ({filteredIds.length})
          </label>
          {selectedIds.size > 0 && (
            <>
              <span className={styles.bulkCount}>Обрано: {selectedIds.size}</span>
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
            </>
          )}
        </div>
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

      {importOpen && (
        <TemplateImportModal
          competitionId={competitionId}
          onClose={() => setImportOpen(false)}
          onImported={(created) => {
            queryClient.setQueryData<Nomination[]>(
              queryKeys.nominations(competitionId),
              (prev) => [...(prev ?? []), ...created],
            );
            void queryClient.invalidateQueries({
              queryKey: queryKeys.nominations(competitionId),
            });
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
