import { useEffect, useMemo, useState } from 'react';
import SpecialCategoryModal from './SpecialCategoryModal';
import type { SpecialNominationDraft } from './SpecialCategoryModal';
import {
  AGE_CATEGORY_TYPE,
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  getCategories,
} from '../../lib/categories';
import AgeRangeFields from './AgeRangeFields';
import {
  PRICED_AXES,
  axisPriceKey,
  resolvePrice,
} from '../../lib/nominationPricing';
import type { AxisPriceMap } from '../../lib/nominationPricing';
import { EMPTY_AGE_RANGE, parseAgeRange } from '../../lib/ageRange';
import type { AgeRange } from '../../lib/ageRange';
import type { Category, CategoryType } from '../../lib/categories';
import type { ExitMode } from '../../lib/categoryTemplates';
import {
  MAX_NOMINATIONS,
  draftCategory,
  emptyAxisSelection,
  pluralNominations,
  sameCategoryValue,
  signatureOf,
} from '../../lib/nominationSet';
import type { AxisSelection, DraftNomination } from '../../lib/nominationSet';
import styles from './NominationSetBuilder.module.css';

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
}

export default function NominationSetBuilder({
  nominations,
  onChange,
  selection: picked,
  onSelectionChange,
  onNotice,
  seedCategoryIds,
  onCategoryCreated,
}: NominationSetBuilderProps) {
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [ageRange, setAgeRange] = useState(EMPTY_AGE_RANGE);
  const [axisPrices, setAxisPrices] = useState<AxisPriceMap>({});
  const [specialOpen, setSpecialOpen] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

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
    if (!raw) return;

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

    let range: AgeRange | undefined;
    if (type === AGE_CATEGORY_TYPE && !existing) {
      const parsed = parseAgeRange(ageRange);
      if (!parsed.ok) {
        setError(parsed.message);
        return;
      }
      range = parsed.range;
    }

    const category = existing ?? draftCategory(raw, type, range);

    updateSelection((current) => ({
      ...current,
      [type]: [...current[type], category],
    }));
    clearInput();
  };

  const removeValue = (type: CategoryType, id: string) =>
    updateSelection((current) => ({
      ...current,
      [type]: current[type].filter((c) => c.id !== id),
    }));

  const generate = () => {
    const active = CATEGORY_TYPES.map((t) => selection[t]).filter(
      (values) => values.length > 0,
    );
    if (active.length === 0) {
      setError('Додайте хоча б одне значення категорії.');
      return;
    }
    if (plannedCount > MAX_NOMINATIONS) {
      setError(
        `${plannedCount} комбінацій — забагато. Максимум ${MAX_NOMINATIONS}, приберіть частину значень.`,
      );
      return;
    }
    setError(null);

    const combos = active.reduce<Category[][]>(
      (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
      [[]],
    );

    const edited = new Map(nominations.map((n) => [n.signature, n]));
    const specials = nominations.filter((n) => n.isSpecial);
    const generated = combos.map((combo) => {
      const categoryIds = combo.map((c) => c.id);
      const signature = signatureOf(categoryIds);
      const price = resolvePrice(combo, axisPrices);
      const previous = edited.get(signature);

      if (previous) {
        // Ціна з осей перебиває збережену: інакше правка «Дуо — 700» не
        // доїхала б до вже згенерованих рядків. Порожня ціна нічого не чіпає,
        // тож ручне значення переживає перегенерацію.
        return price ? { ...previous, price } : previous;
      }

      return {
        signature,
        name: combo.map((c) => c.name).join(' · '),
        price,
        allowsImprovisation: false,
        categoryIds,
        isSpecial: false,
        exitMode: 'single' as ExitMode,
      };
    });

    onChange([...generated, ...specials]);
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
                      {category.ageFrom !== null &&
                        category.ageTo !== null &&
                        ` (${category.ageFrom}–${category.ageTo})`}
                      <button
                        type="button"
                        aria-label={`Прибрати ${category.name}`}
                        onClick={() => removeValue(type, category.id)}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {PRICED_AXES.includes(type) && picked.length > 0 && (
                <div className={styles.axisPrices}>
                  {picked.map((category) => (
                    <label className={styles.axisPrice} key={category.id}>
                      <span>{category.name}</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="ціна"
                        aria-label={`Ціна за «${category.name}»`}
                        value={axisPrices[axisPriceKey(type, category.id)] ?? ''}
                        onChange={(e) =>
                          setAxisPrices((prev) => ({
                            ...prev,
                            [axisPriceKey(type, category.id)]: e.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
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
                  <th className={styles.colImprov}>Імпровізація</th>
                  <th className={styles.colRemove} aria-label="Прибрати" />
                </tr>
              </thead>
              <tbody>
                {nominations.map((nomination) => (
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
      </section>

      <SpecialCategoryModal
        open={specialOpen}
        categories={suggestions}
        submitLabel="Додати до набору"
        createCategoryValue={(name, type, range) =>
          Promise.resolve(
            suggestions.find((s) => sameCategoryValue(s, { name, type })) ??
              draftCategory(name, type, range),
          )
        }
        onClose={() => setSpecialOpen(false)}
        onCategoryCreated={(category) => {
          setSuggestions((prev) =>
            prev.some((s) => s.id === category.id) ? prev : [...prev, category],
          );
          onCategoryCreated?.(category);
        }}
        onSubmit={addSpecial}
      />
    </div>
  );
}
