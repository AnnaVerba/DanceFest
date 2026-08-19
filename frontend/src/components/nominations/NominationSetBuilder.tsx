import { useEffect, useMemo, useState } from 'react';
import SpecialCategoryModal from './SpecialCategoryModal';
import type { SpecialNominationDraft } from './SpecialCategoryModal';
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  CategoryApiError,
  createCategory,
  getCategories,
} from '../../lib/categories';
import type { Category, CategoryType } from '../../lib/categories';
import type { ExitMode } from '../../lib/categoryTemplates';
import {
  MAX_NOMINATIONS,
  pluralNominations,
  signatureOf,
} from '../../lib/nominationSet';
import type { DraftNomination } from '../../lib/nominationSet';
import styles from './NominationSetBuilder.module.css';

interface NominationSetBuilderProps {
  nominations: DraftNomination[];
  onChange: (next: DraftNomination[]) => void;
  onNotice?: (message: string) => void;
  // Осі збереженого набору. Без них редактор відкривався б із порожніми осями
  // над повною таблицею, і «Згенерувати» стерло б усе, що там уже є.
  seedCategoryIds?: string[];
}

type Selection = Record<CategoryType, Category[]>;

function emptySelection(): Selection {
  return CATEGORY_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {} as Selection);
}

/**
 * Конструктор набору номінацій: осі зі спільного довідника, декартів добуток
 * по них і спецкатегорії поверх. Стоїть у двох місцях — у редакторі шаблону і
 * на кроці категорій майстра створення конкурсу.
 *
 * Набір належить власнику компонента: тут живуть лише осі та довідник, а самі
 * номінації приходять і йдуть пропсами. Інакше сторінка не змогла б їх зберегти.
 */
export default function NominationSetBuilder({
  nominations,
  onChange,
  onNotice,
  seedCategoryIds,
}: NominationSetBuilderProps) {
  // Помилка живе тут, а не в сторінці: раніше вона їхала нагору документа, а
  // кнопка «Згенерувати» стоїть унизу — натиснув, і здається, що нічого не сталося.
  const [error, setError] = useState<string | null>(null);
  // null означає «людина осей ще не чіпала» — тоді показуємо ті, що виведені
  // зі збереженого набору. Щойно вона щось додала чи прибрала, стан стає її.
  const [picked, setPicked] = useState<Selection | null>(null);
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [addingType, setAddingType] = useState<CategoryType | null>(null);
  const [specialOpen, setSpecialOpen] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

  const seededSelection = useMemo(() => {
    const restored = emptySelection();
    if (!seedCategoryIds?.length || suggestions.length === 0) return restored;

    const ids = new Set(seedCategoryIds);
    for (const category of suggestions) {
      if (ids.has(category.id)) restored[category.type].push(category);
    }
    return restored;
  }, [seedCategoryIds, suggestions]);

  const selection = picked ?? seededSelection;

  const updateSelection = (next: (current: Selection) => Selection) =>
    setPicked((prev) => next(prev ?? seededSelection));

  const plannedCount = useMemo(() => {
    const active = CATEGORY_TYPES.map((t) => selection[t]).filter(
      (values) => values.length > 0,
    );
    if (active.length === 0) return 0;
    return active.reduce((acc, values) => acc * values.length, 1);
  }, [selection]);

  const addValue = async (type: CategoryType) => {
    const raw = (inputs[type] ?? '').trim();
    if (!raw) return;

    const alreadyPicked = selection[type].some(
      (c) => c.name.trim().toLowerCase() === raw.toLowerCase(),
    );
    if (alreadyPicked) {
      setInputs((prev) => ({ ...prev, [type]: '' }));
      return;
    }

    setAddingType(type);
    setError(null);
    try {
      // Бек поверне наявну категорію, якщо така вже є в спільному довіднику.
      const category = await createCategory(raw, type);
      updateSelection((current) => ({
        ...current,
        [type]: [...current[type], category],
      }));
      setSuggestions((prev) =>
        prev.some((s) => s.id === category.id) ? prev : [...prev, category],
      );
      setInputs((prev) => ({ ...prev, [type]: '' }));
    } catch (err) {
      setError(
        err instanceof CategoryApiError
          ? err.message
          : 'Не вдалося додати значення категорії.',
      );
    } finally {
      setAddingType(null);
    }
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
    // Спецкатегорії не входять у декартів добуток осей — регенерація їх
    // не перебирає й не має права затерти.
    const specials = nominations.filter((n) => n.isSpecial);
    // Наявні рядки зберігають ціну й галочку, нові комбінації додаються.
    const generated = combos.map((combo) => {
      const categoryIds = combo.map((c) => c.id);
      const signature = signatureOf(categoryIds);
      return (
        edited.get(signature) ?? {
          signature,
          name: combo.map((c) => c.name).join(' · '),
          price: '',
          allowsImprovisation: false,
          categoryIds,
          isSpecial: false,
          exitMode: 'single' as ExitMode,
        }
      );
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
    // Ліміти тривалості й перелік виходів сюди не йдуть: перше налаштовується
    // під конкретний конкурс, друге — похідне від складу номінації.
    onChange([
      ...nominations,
      ...fresh.map((d) => ({
        signature: d.signature,
        name: d.name,
        price: d.price,
        allowsImprovisation: d.allowsImprovisation,
        categoryIds: d.categoryIds,
        isSpecial: d.isSpecial,
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
                      void addValue(type);
                    }
                  }}
                />
                <datalist id={`suggestions-${type}`}>
                  {options.map((option) => (
                    <option key={option.id} value={option.name} />
                  ))}
                </datalist>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm}`}
                  onClick={() => void addValue(type)}
                  disabled={addingType === type}
                >
                  {addingType === type ? 'Додаю...' : 'Додати значення'}
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
        onClose={() => setSpecialOpen(false)}
        onCategoryCreated={(category) =>
          setSuggestions((prev) =>
            prev.some((s) => s.id === category.id) ? prev : [...prev, category],
          )
        }
        onSubmit={addSpecial}
      />
    </div>
  );
}
