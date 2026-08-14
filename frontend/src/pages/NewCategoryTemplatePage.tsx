import { useMemo, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getToken } from '../lib/auth';
import { CategoryTemplateApiError, createCategoryTemplate } from '../lib/categoryTemplates';
import styles from './CategoryTemplateFormPage.module.css';

let draftIdCounter = 0;
function nextDraftId(): string {
  draftIdCounter += 1;
  return `axis-${draftIdCounter}`;
}

const DEFAULT_AXIS_NAMES = ['Кількість учасників', 'Вік', 'Рівень', 'Напрямок', 'Дисципліна'];

interface DraftAxis {
  id: string;
  name: string;
  values: string[];
}

function defaultAxes(): DraftAxis[] {
  return DEFAULT_AXIS_NAMES.map((name) => ({ id: nextDraftId(), name, values: [] }));
}

function pluralCategories(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'категорія';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'категорії';
  return 'категорій';
}

function pluralNominations(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'номінацію';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'номінації';
  return 'номінацій';
}

function cartesianCount(axes: DraftAxis[]): number {
  const active = axes.filter((a) => a.values.length > 0);
  if (active.length === 0) return 0;
  return active.reduce((acc, axis) => acc * axis.values.length, 1);
}

export default function NewCategoryTemplatePage() {
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  const [axes, setAxes] = useState<DraftAxis[]>(defaultAxes);
  const [newAxisNameInput, setNewAxisNameInput] = useState('');
  const [axisValueInputs, setAxisValueInputs] = useState<Record<string, string>>({});
  const [nameError, setNameError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nominationsCount = useMemo(() => cartesianCount(axes), [axes]);
  const categoriesWithValues = useMemo(() => axes.filter((a) => a.values.length > 0).length, [axes]);

  const addAxis = () => {
    const value = newAxisNameInput.trim();
    if (!value) return;
    setAxes((prev) => [...prev, { id: nextDraftId(), name: value, values: [] }]);
    setNewAxisNameInput('');
  };

  const removeAxis = (id: string) => setAxes((prev) => prev.filter((a) => a.id !== id));

  const renameAxis = (id: string, value: string) =>
    setAxes((prev) => prev.map((a) => (a.id === id ? { ...a, name: value } : a)));

  const addAxisValue = (axisId: string) => {
    const value = (axisValueInputs[axisId] ?? '').trim();
    if (!value) return;
    setAxes((prev) =>
      prev.map((a) => (a.id === axisId ? { ...a, values: [...a.values, value] } : a)),
    );
    setAxisValueInputs((prev) => ({ ...prev, [axisId]: '' }));
  };

  const removeAxisValue = (axisId: string, index: number) =>
    setAxes((prev) =>
      prev.map((a) =>
        a.id === axisId ? { ...a, values: a.values.filter((_, i) => i !== index) } : a,
      ),
    );

  const handleSave = async () => {
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    setSubmitError(null);

    const templateAxes = axes
      .filter((a) => a.name.trim() && a.values.length > 0)
      .map((a) => ({ name: a.name.trim(), values: a.values }));
    if (templateAxes.length === 0) {
      setSubmitError('Додайте хоча б одну категорію зі значеннями.');
      return;
    }

    setSubmitting(true);
    try {
      const template = await createCategoryTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        isPublic,
        axes: templateAxes,
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
        <div className={styles.wrap}>
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
            {axes.map((axis) => (
              <div className={styles.axis} key={axis.id}>
                <div className={styles.axisHead}>
                  <input
                    type="text"
                    aria-label="Назва категорії"
                    value={axis.name}
                    onChange={(e) => renameAxis(axis.id, e.target.value)}
                  />
                  <button
                    type="button"
                    className={styles.linkDanger}
                    onClick={() => removeAxis(axis.id)}
                  >
                    Видалити категорію
                  </button>
                </div>
                {axis.values.length > 0 && (
                  <div className={styles.chips}>
                    {axis.values.map((v, i) => (
                      <span className={styles.chip} key={`${axis.id}-${i}`}>
                        {v}
                        <button
                          type="button"
                          aria-label="Прибрати значення"
                          onClick={() => removeAxisValue(axis.id, i)}
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
                    placeholder="Нове значення"
                    aria-label="Нове значення"
                    value={axisValueInputs[axis.id] ?? ''}
                    onChange={(e) =>
                      setAxisValueInputs((prev) => ({ ...prev, [axis.id]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAxisValue(axis.id);
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`${styles.btn} ${styles.btnSm}`}
                    onClick={() => addAxisValue(axis.id)}
                  >
                    Додати значення
                  </button>
                </div>
              </div>
            ))}
            <div className={styles.newAxis}>
              <input
                type="text"
                placeholder="Нова категорія (напр. Дисципліна)"
                aria-label="Нова категорія"
                value={newAxisNameInput}
                onChange={(e) => setNewAxisNameInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAxis()}
              />
              <button type="button" className={styles.btnGold} onClick={addAxis}>
                Додати категорію
              </button>
            </div>

            {categoriesWithValues > 0 && (
              <p className={styles.hint}>
                {categoriesWithValues} {pluralCategories(categoriesWithValues)} зі значеннями ·
                буде згенеровано {nominationsCount} {pluralNominations(nominationsCount)}
              </p>
            )}
          </section>

          <div className={styles.actions}>
            <Link to="/category-templates" className={styles.btn}>
              Скасувати
            </Link>
            <button
              type="button"
              className={styles.btnGold}
              onClick={handleSave}
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
