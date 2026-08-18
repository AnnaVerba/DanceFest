import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getToken } from '../lib/auth';
import {
  CategoryTemplateApiError,
  createCategoryTemplate,
} from '../lib/categoryTemplates';
import {
  CATEGORY_TYPES,
  CATEGORY_TYPE_LABELS,
  CategoryApiError,
  createCategory,
  getCategories,
} from '../lib/categories';
import type { Category, CategoryType } from '../lib/categories';
import styles from './CategoryTemplateFormPage.module.css';

// Та сама стеля, що й на беку: п'ять типів по десять значень дають
// 100 000 комбінацій, і без межі це кладе і браузер, і базу.
const MAX_NOMINATIONS = 2000;

interface DraftNomination {
  // Відсортовані categoryIds — за нею впізнаємо вже відредагований рядок
  // при повторній генерації.
  signature: string;
  name: string;
  price: string;
  allowsImprovisation: boolean;
  categoryIds: string[];
}

type Selection = Record<CategoryType, Category[]>;

function emptySelection(): Selection {
  return CATEGORY_TYPES.reduce((acc, type) => {
    acc[type] = [];
    return acc;
  }, {} as Selection);
}

function signatureOf(ids: string[]): string {
  return [...ids].sort().join('|');
}

function pluralNominations(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'номінація';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'номінації';
  return 'номінацій';
}

export default function NewCategoryTemplatePage() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [selection, setSelection] = useState<Selection>(emptySelection);
  const [suggestions, setSuggestions] = useState<Category[]>([]);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [addingType, setAddingType] = useState<CategoryType | null>(null);

  const [nominations, setNominations] = useState<DraftNomination[]>([]);
  const [nameError, setNameError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getCategories()
      .then(setSuggestions)
      .catch(() => setSuggestions([]));
  }, []);

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
    setSubmitError(null);
    try {
      // Бек поверне наявну категорію, якщо така вже є в спільному довіднику.
      const category = await createCategory(raw, type);
      setSelection((prev) => ({ ...prev, [type]: [...prev[type], category] }));
      setSuggestions((prev) =>
        prev.some((s) => s.id === category.id) ? prev : [...prev, category],
      );
      setInputs((prev) => ({ ...prev, [type]: '' }));
    } catch (err) {
      setSubmitError(
        err instanceof CategoryApiError
          ? err.message
          : 'Не вдалося додати значення категорії.',
      );
    } finally {
      setAddingType(null);
    }
  };

  const removeValue = (type: CategoryType, id: string) =>
    setSelection((prev) => ({
      ...prev,
      [type]: prev[type].filter((c) => c.id !== id),
    }));

  const generate = () => {
    const active = CATEGORY_TYPES.map((t) => selection[t]).filter(
      (values) => values.length > 0,
    );
    if (active.length === 0) {
      setSubmitError('Додайте хоча б одне значення категорії.');
      return;
    }
    if (plannedCount > MAX_NOMINATIONS) {
      setSubmitError(
        `${plannedCount} комбінацій — забагато. Максимум ${MAX_NOMINATIONS}, приберіть частину значень.`,
      );
      return;
    }
    setSubmitError(null);

    const combos = active.reduce<Category[][]>(
      (acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])),
      [[]],
    );

    setNominations((prev) => {
      const edited = new Map(prev.map((n) => [n.signature, n]));
      // Наявні рядки зберігають ціну й галочку, нові комбінації додаються.
      return combos.map((combo) => {
        const categoryIds = combo.map((c) => c.id);
        const signature = signatureOf(categoryIds);
        return (
          edited.get(signature) ?? {
            signature,
            name: combo.map((c) => c.name).join(' · '),
            price: '',
            allowsImprovisation: false,
            categoryIds,
          }
        );
      });
    });
  };

  const patchNomination = (signature: string, patch: Partial<DraftNomination>) =>
    setNominations((prev) =>
      prev.map((n) => (n.signature === signature ? { ...n, ...patch } : n)),
    );

  const removeNomination = (signature: string) =>
    setNominations((prev) => prev.filter((n) => n.signature !== signature));

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setSubmitError(null);

    if (nominations.length === 0) {
      setSubmitError('Згенеруйте номінації — шаблон не може бути порожнім.');
      return;
    }

    const withBadPrice = nominations.find(
      (n) => n.price.trim() !== '' && !(Number(n.price) >= 0),
    );
    if (withBadPrice) {
      setSubmitError(`Некоректна ціна в номінації «${withBadPrice.name}».`);
      return;
    }

    setSubmitting(true);
    try {
      const template = await createCategoryTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        nominations: nominations.map((n, index) => ({
          name: n.name.trim(),
          price: n.price.trim() === '' ? undefined : Number(n.price),
          allowsImprovisation: n.allowsImprovisation,
          categoryIds: n.categoryIds,
          sortOrder: index,
        })),
      });
      showToast(`Шаблон «${template.name}» створено`);
      setTimeout(() => navigate('/category-templates'), 700);
    } catch (err) {
      setSubmitError(
        err instanceof CategoryTemplateApiError
          ? err.message
          : 'Не вдалося створити шаблон. Спробуйте ще раз.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
      <AdminHeader />
      <main className={styles.main}>
        <div className={`${styles.wrap} ${styles.wide}`}>
          <Link to="/category-templates" className={styles.back}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Назад до шаблонів
          </Link>
          <h1>Редактор шаблону</h1>

          {submitError && <p className={styles.error}>{submitError}</p>}

          <section className={styles.panel}>
            <p className={styles.sectionTitle}>Загальна інформація</p>
            <div className={styles.field}>
              <label htmlFor="t-name">
                Назва шаблону <span className={styles.req}>*</span>
              </label>
              <input
                id="t-name"
                type="text"
                placeholder="Східний танець — стандарт"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (e.target.value.trim()) setNameError(false);
                }}
              />
              {nameError && <p className={styles.fieldError}>Вкажіть назву шаблону.</p>}
            </div>
            <div className={styles.field}>
              <label htmlFor="t-desc">Опис</label>
              <textarea
                id="t-desc"
                placeholder="Для яких конкурсів підходить цей набір критеріїв"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className={styles.visibility} role="group" aria-label="Видимість шаблону">
              <button
                type="button"
                className={styles.vis}
                aria-pressed={!isPublic}
                onClick={() => setIsPublic(false)}
              >
                <span className={styles.dot} />
                Приватний
              </button>
              <button
                type="button"
                className={styles.vis}
                aria-pressed={isPublic}
                onClick={() => setIsPublic(true)}
              >
                <span className={styles.dot} />
                Публічний
              </button>
            </div>
          </section>

          <section className={styles.panel}>
            <p className={styles.sectionTitle}>Категорії (з яких складаються номінації)</p>

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
              {plannedCount > 0 && (
                <span className={styles.hint}>
                  буде {plannedCount} {pluralNominations(plannedCount)}
                </span>
              )}
            </div>
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

          <div className={styles.actions}>
            <Link to="/category-templates" className={styles.btn}>
              Скасувати
            </Link>
            <button
              type="button"
              className={styles.btnGold}
              onClick={() => void handleSave()}
              disabled={submitting}
            >
              {submitting ? 'Створення...' : 'Створити шаблон'}
            </button>
          </div>
        </div>
      </main>

      <ToastStack toasts={toasts} />
    </>
  );
}
