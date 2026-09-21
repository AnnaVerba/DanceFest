import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import SpecialCategoryModal from './SpecialCategoryModal';
import type { SpecialNominationDraft } from './SpecialCategoryModal';
import AxisPriceInputs from './AxisPriceInputs';
import {
  AGE_CATEGORY_TYPE,
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  CategoryApiError,
  getCategories,
  updateCategoryAgeRange,
} from '../../lib/categories';
import { queryKeys } from '../../lib/queryKeys';
import { REFERENCE_STALE_TIME_MS } from '../../lib/queryClient.constants';
import AgeRangeFields from './AgeRangeFields';
import { PRICED_AXES, resolvePrice } from '../../lib/nominationPricing';
import type { AxisPriceMap } from '../../lib/nominationPricing';
import {
  EMPTY_AGE_RANGE,
  parseAgeRange,
} from '../../lib/ageRange';
import type { AgeRange } from '../../lib/ageRange';
import type { Category, CategoryType } from '../../lib/categories';
import type { ExitMode } from '../../lib/categoryTemplates';
import {
  MAX_NOMINATIONS,
  draftCategory,
  emptyAxisSelection,
  isDraftCategory,
  pluralNominations,
  sameCategoryValue,
  signatureOf,
} from '../../lib/nominationSet';
import type { AxisSelection, DraftNomination } from '../../lib/nominationSet';
import {
  AGE_RANGE_CANCEL_LABEL,
  AGE_RANGE_EDIT_LABEL,
  AGE_RANGE_SAVE_FAILED_MESSAGE,
  AGE_RANGE_SAVE_LABEL,
  AGE_RANGE_SAVING_LABEL,
  CATEGORY_VALUE_NAME_REQUIRED_MESSAGE,
  NOMINATIONS_TABLE_PAGE_SIZE,
  REMOVE_AXIS_VALUE_DROP_LABEL,
  REMOVE_AXIS_VALUE_KEEP_LABEL,
  REMOVE_AXIS_VALUE_TITLE,
} from './NominationSetBuilder.constants';
import type { PendingAxisRemoval } from './pendingAxisRemoval.types';
import ConfirmDialog from '../admin/ConfirmDialog';
import styles from './NominationSetBuilder.module.css';

// Stable reference so useMemo below doesn't see a "new" array on every
// render while the query has no data yet.
const EMPTY_CATEGORIES: Category[] = [];

interface NominationSetBuilderProps {
  nominations: DraftNomination[];
  onChange: (next: DraftNomination[]) => void;
  selection: AxisSelection | null;
  onSelectionChange: (next: AxisSelection) => void;
  onNotice?: (message: string) => void;
  seedCategoryIds?: string[];
  // Категорії, створені лише в модалці спецкатегорії, не потрапляють у
  // selection — цей колбек несе їх межі туди, де їх шукає resolveDraftCategories.
  onCategoryCreated?: (category: Category) => void;
  // У шаблонах категорій статус імпровізації не задається — колонку ховаємо.
  hideImprovisation?: boolean;
}

export default function NominationSetBuilder({
  nominations,
  onChange,
  selection: picked,
  onSelectionChange,
  onNotice,
  seedCategoryIds,
  onCategoryCreated,
  hideImprovisation = false,
}: NominationSetBuilderProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [ageRange, setAgeRange] = useState(EMPTY_AGE_RANGE);
  const [editingAgeId, setEditingAgeId] = useState<string | null>(null);
  const [editedRange, setEditedRange] = useState(EMPTY_AGE_RANGE);
  const [savingRange, setSavingRange] = useState(false);
  const [axisPrices, setAxisPrices] = useState<AxisPriceMap>({});
  const [specialOpen, setSpecialOpen] = useState(false);
  const [nominationsPage, setNominationsPage] = useState(0);
  const [pendingRemoval, setPendingRemoval] = useState<PendingAxisRemoval | null>(
    null,
  );

  // Categories are a near-static reference used across many forms — cached
  // indefinitely, refreshed only when an admin edit invalidates it.
  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories(),
    queryFn: () => getCategories(),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
  const suggestions = categoriesQuery.data ?? EMPTY_CATEGORIES;

  useEffect(() => {
    if (!categoriesQuery.isError) return;
    const message = 'Не вдалося завантажити довідник категорій.';
    if (onNotice) onNotice(message);
    else setError(message);
  }, [categoriesQuery.isError, onNotice]);

  const seededSelection = useMemo(() => {
    const restored = emptyAxisSelection();
    if (!seedCategoryIds?.length || suggestions.length === 0) return restored;

    const ids = new Set(seedCategoryIds);
    for (const category of suggestions) {
      if (ids.has(category.id)) restored[category.type].push(category);
    }
    return restored;
  }, [seedCategoryIds, suggestions]);

  const selection = picked ?? seededSelection;

  const updateSelection = (next: (current: AxisSelection) => AxisSelection) => {
    setError(null);
    onSelectionChange(next(selection));
  };

  const plannedCount = useMemo(() => {
    const active = CATEGORY_TYPES.map((t) => selection[t]).filter(
      (values) => values.length > 0,
    );
    if (active.length === 0) return 0;
    return active.reduce((acc, values) => acc * values.length, 1);
  }, [selection]);

  const addValue = (type: CategoryType) => {
    const raw = (inputs[type] ?? '').trim();
    if (!raw) {
      setError(CATEGORY_VALUE_NAME_REQUIRED_MESSAGE);
      return;
    }

    const clearInput = () => {
      setInputs((prev) => ({ ...prev, [type]: '' }));
      if (type === AGE_CATEGORY_TYPE) setAgeRange(EMPTY_AGE_RANGE);
    };
    const candidate = { name: raw, type };

    if (selection[type].some((c) => sameCategoryValue(c, candidate))) {
      clearInput();
      return;
    }

    const existing = suggestions.find((s) => sameCategoryValue(s, candidate));

    // Довідник спільний за назвою: якщо значення з такою назвою вже є,
    // порожні поля «від»/«до» означають «використати наявне», а заповнені —
    // намір користувача або підтвердити, або перевизначити його межі. Тихо
    // відкидати введене й підставляти чуже — саме той сценарій, що ламав
    // BUG-03.
    let range: AgeRange | undefined;
    if (type === AGE_CATEGORY_TYPE) {
      const rangeEntered = ageRange.from.trim() !== '' || ageRange.to.trim() !== '';
      if (!existing || rangeEntered) {
        const parsed = parseAgeRange(ageRange);
        if (!parsed.ok) {
          setError(parsed.message);
          return;
        }
        range = parsed.range;
      }
    }

    const category =
      existing && !range ? existing : draftCategory(raw, type, range);

    updateSelection((current) => ({
      ...current,
      [type]: [...current[type], category],
    }));
    clearInput();
  };

  const startEditingRange = (category: Category) => {
    setEditingAgeId(category.id);
    setEditedRange({
      from: String(category.ageFrom ?? ''),
      to: String(category.ageTo ?? ''),
    });
  };

  // Межі значення зі спільного довідника змінюються одразу на сервері (вони
  // діють в усіх конкурсах), чернетки ще не збережені — лише в наборі.
  const saveRange = async (category: Category) => {
    const parsed = parseAgeRange(editedRange);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }

    setSavingRange(true);
    try {
      const updated = isDraftCategory(category.id)
        ? draftCategory(category.name, category.type, parsed.range)
        : await updateCategoryAgeRange(category.id, parsed.range);
      if (!isDraftCategory(category.id)) {
        queryClient.setQueryData<Category[]>(queryKeys.categories(), (prev) =>
          prev?.map((c) => (c.id === updated.id ? updated : c)),
        );
      }
      updateSelection((current) => ({
        ...current,
        [category.type]: current[category.type].map((c) =>
          c.id === updated.id ? updated : c,
        ),
      }));
      setEditingAgeId(null);
    } catch (err) {
      setError(
        err instanceof CategoryApiError
          ? err.message
          : AGE_RANGE_SAVE_FAILED_MESSAGE,
      );
    } finally {
      setSavingRange(false);
    }
  };

  const dropFromSelection = (type: CategoryType, id: string) =>
    updateSelection((current) => ({
      ...current,
      [type]: current[type].filter((c) => c.id !== id),
    }));

  // Значення, яке вже використане в номінаціях, прибирається лише після
  // вибору: «лише з вибору» зберігає згенероване (генерація частинами,
  // BUG-05), «разом із номінаціями» — щоб видалене значення не лишилось у
  // payload і не потрапило у валідацію діапазонів (BUG-09).
  const removeValue = (type: CategoryType, category: Category) => {
    const nominationCount = nominations.filter((n) =>
      n.categoryIds.includes(category.id),
    ).length;
    if (nominationCount === 0) {
      dropFromSelection(type, category.id);
      return;
    }
    setPendingRemoval({ type, category, nominationCount });
  };

  const keepNominationsOfPending = () => {
    if (!pendingRemoval) return;
    const { type, category } = pendingRemoval;
    dropFromSelection(type, category.id);
    // Номінації й далі посилаються на значення, а сторінка шукає його межі
    // та лігу лише в осях і в «додаткових» категоріях — передаємо його туди.
    onCategoryCreated?.(category);
    setPendingRemoval(null);
  };

  const dropNominationsOfPending = () => {
    if (!pendingRemoval) return;
    const { type, category } = pendingRemoval;
    dropFromSelection(type, category.id);
    onChange(nominations.filter((n) => !n.categoryIds.includes(category.id)));
    setPendingRemoval(null);
  };

  const generate = () => {
    setNotice(null);
    const active = CATEGORY_TYPES.map((t) => selection[t]).filter(
      (values) => values.length > 0,
    );
    if (active.length === 0) {
      setError('Додайте хоча б одне значення категорії.');
      return;
    }
    if (plannedCount > MAX_NOMINATIONS) {
      setError(
        `${plannedCount} комбінацій за один раз — забагато. Максимум ${MAX_NOMINATIONS} за клік; приберіть частину значень або згенеруйте кількома заходами — раніше згенеровані номінації не зникнуть.`,
      );
      return;
    }
    setError(null);

    const combos = active.reduce<Category[][]>(
      (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
      [[]],
    );

    // Мердж, а не заміна: попередньо згенеровані номінації (зокрема з
    // осей, які вже прибрані з поточного вибору) лишаються в наборі —
    // інакше перегенерація партіями (обхід ліміту на комбінації за раз)
    // губить уже зібране (BUG-05).
    const bySignature = new Map(nominations.map((n) => [n.signature, n]));
    let added = 0;
    let duplicates = 0;

    for (const combo of combos) {
      const categoryIds = combo.map((c) => c.id);
      const signature = signatureOf(categoryIds);
      const price = resolvePrice(combo, axisPrices);
      const existing = bySignature.get(signature);

      if (existing) {
        duplicates += 1;
        // Ціна з осей перебиває збережену: інакше правка «Дуо — 700» не
        // доїхала б до вже згенерованих рядків. Порожня ціна нічого не чіпає,
        // тож ручне значення переживає перегенерацію.
        if (price) bySignature.set(signature, { ...existing, price });
        continue;
      }

      added += 1;
      bySignature.set(signature, {
        signature,
        name: combo.map((c) => c.name).join(' · '),
        price,
        allowsImprovisation: false,
        categoryIds,
        isSpecial: false,
        exitMode: 'single' as ExitMode,
      });
    }

    const merged = [...bySignature.values()];
    onChange(merged);
    setNominationsPage(0);

    const message = `Додано ${added}, пропущено дублікатів ${duplicates}, усього ${merged.length} ${pluralNominations(merged.length)}. Не забудьте зберегти зміни — інакше згенероване буде втрачено.`;
    if (onNotice) onNotice(message);
    else setNotice(message);
  };

  const addSpecial = (drafts: SpecialNominationDraft[]) => {
    const known = new Set(nominations.map((n) => n.signature));
    const fresh = drafts.filter((d) => !known.has(d.signature));

    if (fresh.length === 0) {
      onNotice?.('Ці номінації вже є в наборі');
      return;
    }
    onNotice?.(
      fresh.length < drafts.length
        ? `Додано ${fresh.length} із ${drafts.length}: решта вже є в наборі`
        : `Додано ${fresh.length} ${pluralNominations(fresh.length)}`,
    );
    onChange([
      ...nominations,
      ...fresh.map((d) => ({
        signature: d.signature,
        name: d.name,
        price: d.price,
        allowsImprovisation: d.allowsImprovisation,
        categoryIds: d.categoryIds,
        isSpecial: d.isSpecial,
        specialName: d.specialName,
        exitMode: d.exitMode,
      })),
    ]);
  };

  const patchNomination = (signature: string, patch: Partial<DraftNomination>) =>
    onChange(
      nominations.map((n) => (n.signature === signature ? { ...n, ...patch } : n)),
    );

  const removeNomination = (signature: string) =>
    onChange(nominations.filter((n) => n.signature !== signature));

  const nominationsPageCount = Math.max(
    1,
    Math.ceil(nominations.length / NOMINATIONS_TABLE_PAGE_SIZE),
  );
  // Derived, not synced via effect: shrinking the list (regenerate, remove
  // a row) can never leave the visible page pointing past the new end.
  const currentNominationsPage = Math.min(nominationsPage, nominationsPageCount - 1);
  const visibleNominations = nominations.slice(
    currentNominationsPage * NOMINATIONS_TABLE_PAGE_SIZE,
    (currentNominationsPage + 1) * NOMINATIONS_TABLE_PAGE_SIZE,
  );

  return (
    <div className={styles.builder}>
      <section className={styles.panel}>
        <p className={styles.sectionTitle}>
          Категорії (з яких складаються номінації)
        </p>

        {CATEGORY_TYPES.map((type) => {
          const picked = selection[type];
          const options = suggestions.filter(
            (s) => s.type === type && !picked.some((p) => p.id === s.id),
          );
          return (
            <div className={styles.axis} key={type}>
              <div className={styles.axisHead}>
                <strong>{CATEGORY_TYPE_LABELS[type]}</strong>
              </div>
              {picked.length > 0 && (
                <div className={styles.chips}>
                  {picked.map((category) => (
                    <span className={styles.chip} key={category.id}>
                      {category.name}
                      {editingAgeId === category.id ? (
                        <>
                          <AgeRangeFields
                            value={editedRange}
                            onChange={setEditedRange}
                            inputClassName={styles.chipAgeBound}
                          />
                          <button
                            type="button"
                            disabled={savingRange}
                            onClick={() => void saveRange(category)}
                          >
                            {savingRange
                              ? AGE_RANGE_SAVING_LABEL
                              : AGE_RANGE_SAVE_LABEL}
                          </button>
                          <button
                            type="button"
                            disabled={savingRange}
                            onClick={() => setEditingAgeId(null)}
                          >
                            {AGE_RANGE_CANCEL_LABEL}
                          </button>
                        </>
                      ) : (
                        <>
                          {category.ageFrom !== null &&
                            category.ageTo !== null &&
                            ` (${category.ageFrom}–${category.ageTo})`}
                          {type === AGE_CATEGORY_TYPE && (
                            <button
                              type="button"
                              aria-label={`${AGE_RANGE_EDIT_LABEL}: ${category.name}`}
                              title={AGE_RANGE_EDIT_LABEL}
                              onClick={() => startEditingRange(category)}
                            >
                              ✎
                            </button>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        aria-label={`Прибрати ${category.name}`}
                        onClick={() => removeValue(type, category)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {PRICED_AXES.includes(type) && picked.length > 0 && (
                <AxisPriceInputs
                  categories={picked}
                  prices={axisPrices}
                  onChange={setAxisPrices}
                />
              )}
              <div className={styles.axisAdd}>
                <input
                  type="text"
                  list={`suggestions-${type}`}
                  placeholder="Нове значення"
                  aria-label={`Значення категорії «${CATEGORY_TYPE_LABELS[type]}»`}
                  value={inputs[type] ?? ''}
                  onChange={(e) =>
                    setInputs((prev) => ({ ...prev, [type]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addValue(type);
                    }
                  }}
                />
                {type === AGE_CATEGORY_TYPE && (
                  <AgeRangeFields
                    value={ageRange}
                    onChange={setAgeRange}
                    inputClassName={styles.ageBound}
                  />
                )}
                <datalist id={`suggestions-${type}`}>
                  {options.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm}`}
                  onClick={() => addValue(type)}
                >
                  Додати значення
                </button>
              </div>
            </div>
          );
        })}

        <div className={styles.genBar}>
          <button type="button" className={styles.btnGold} onClick={generate}>
            Згенерувати номінації
          </button>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={() => setSpecialOpen(true)}
          >
            Додати спеціальну категорію
          </button>
          {plannedCount > 0 && (
            <span className={styles.hint}>
              буде {plannedCount} {pluralNominations(plannedCount)}
            </span>
          )}
        </div>

        {error && <p className={styles.error}>{error}</p>}
        {notice && <p className={styles.hint}>{notice}</p>}
      </section>

      <section className={styles.panel}>
        <p className={styles.sectionTitle}>
          Номінації {nominations.length > 0 && `(${nominations.length})`}
        </p>

        {nominations.length === 0 ? (
          <p className={styles.empty}>
            Оберіть значення категорій вище й натисніть «Згенерувати номінації».
          </p>
        ) : (
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Назва</th>
                  <th className={styles.colPrice}>Ціна, грн</th>
                  {!hideImprovisation && (
                    <th className={styles.colImprov}>Імпровізація</th>
                  )}
                  <th className={styles.colRemove} aria-label="Прибрати" />
                </tr>
              </thead>
              <tbody>
                {visibleNominations.map((nomination) => (
                  <tr key={nomination.signature}>
                    <td>
                      <div className={styles.nameCell}>
                        {nomination.isSpecial && (
                          <span
                            className={styles.specialTag}
                            title={
                              nomination.exitMode === 'single'
                                ? 'Спеціальна категорія: один вихід на сцену'
                                : 'Спеціальна категорія: окремий вихід на кожну програму'
                            }
                          >
                            Спец
                          </span>
                        )}
                        <input
                          type="text"
                          aria-label="Назва номінації"
                          value={nomination.name}
                          onChange={(e) =>
                            patchNomination(nomination.signature, {
                              name: e.target.value,
                            })
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        placeholder="—"
                        aria-label={`Ціна номінації «${nomination.name}»`}
                        value={nomination.price}
                        onChange={(e) =>
                          patchNomination(nomination.signature, {
                            price: e.target.value,
                          })
                        }
                      />
                    </td>
                    {!hideImprovisation && (
                      <td className={styles.improvCell}>
                        <input
                          type="checkbox"
                          aria-label={`Дозволити імпровізацію в «${nomination.name}»`}
                          checked={nomination.allowsImprovisation}
                          onChange={(e) =>
                            patchNomination(nomination.signature, {
                              allowsImprovisation: e.target.checked,
                            })
                          }
                        />
                      </td>
                    )}
                    <td>
                      <button
                        type="button"
                        className={styles.rowRemove}
                        aria-label={`Прибрати «${nomination.name}»`}
                        onClick={() => removeNomination(nomination.signature)}
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {nominationsPageCount > 1 && (
          <div className={styles.pager}>
            <button
              type="button"
              className={styles.btn}
              disabled={currentNominationsPage <= 0}
              onClick={() => setNominationsPage((p) => Math.max(0, p - 1))}
            >
              ‹ Попередні
            </button>
            <span>
              Сторінка {currentNominationsPage + 1} з {nominationsPageCount}
            </span>
            <button
              type="button"
              className={styles.btn}
              disabled={currentNominationsPage >= nominationsPageCount - 1}
              onClick={() =>
                setNominationsPage((p) => Math.min(nominationsPageCount - 1, p + 1))
              }
            >
              Наступні ›
            </button>
          </div>
        )}
      </section>

      <SpecialCategoryModal
        open={specialOpen}
        categories={suggestions}
        submitLabel="Додати до набору"
        createCategoryValue={(name, type, range) =>
          Promise.resolve(
            (!range &&
              suggestions.find((s) => sameCategoryValue(s, { name, type }))) ||
              draftCategory(name, type, range),
          )
        }
        onClose={() => setSpecialOpen(false)}
        onCategoryCreated={(category) => {
          // Only a real, persisted category belongs in the shared reference
          // cache — drafts get their `draft:` id resolved into a real one
          // later, by resolveDraftCategories.
          if (!isDraftCategory(category.id)) {
            queryClient.setQueryData<Category[]>(queryKeys.categories(), (prev) =>
              prev?.some((s) => s.id === category.id) ? prev : [...(prev ?? []), category],
            );
          }
          onCategoryCreated?.(category);
        }}
        onSubmit={addSpecial}
      />

      <ConfirmDialog
        open={pendingRemoval !== null}
        title={REMOVE_AXIS_VALUE_TITLE}
        description={
          pendingRemoval
            ? `«${pendingRemoval.category.name}» уже використано в номінаціях: ${pendingRemoval.nominationCount}. Прибрати значення лише з вибору (номінації лишаться) чи видалити разом із ними?`
            : ''
        }
        secondaryLabel={REMOVE_AXIS_VALUE_KEEP_LABEL}
        onSecondary={keepNominationsOfPending}
        confirmLabel={REMOVE_AXIS_VALUE_DROP_LABEL}
        onConfirm={dropNominationsOfPending}
        onCancel={() => setPendingRemoval(null)}
      />
    </div>
  );
}
