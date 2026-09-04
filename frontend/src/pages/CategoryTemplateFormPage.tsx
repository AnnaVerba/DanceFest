import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getToken } from '../lib/auth';
import {
  CategoryTemplateApiError,
  createCategoryTemplate,
  getCategoryTemplate,
  updateCategoryTemplate,
} from '../lib/categoryTemplates';
import NominationSetBuilder from '../components/nominations/NominationSetBuilder';
import { resolveDraftCategories, savedSignatureOf } from '../lib/nominationSet';
import type { AxisSelection, DraftNomination } from '../lib/nominationSet';
import { CategoryApiError } from '../lib/categories';
import type { Category } from '../lib/categories';
import styles from './CategoryTemplateFormPage.module.css';

export default function CategoryTemplateFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toasts, showToast } = useToasts();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [nominations, setNominations] = useState<DraftNomination[]>([]);
  const [axes, setAxes] = useState<AxisSelection | null>(null);
  // Категорії зі спецмодалки, відсутні в axes — потрібні resolveDraftCategories,
  // щоб не загубити ageFrom/ageTo нової вікової категорії при збереженні.
  const [extraCategories, setExtraCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(isEdit);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    getCategoryTemplate(id)
      .then((detail) => {
        if (cancelled) return;
        setName(detail.name);
        setDescription(detail.description ?? '');
        setIsPublic(detail.isPublic);
        setNominations(
          detail.nominations.map((n) => ({
            signature: savedSignatureOf(n),
            name: n.name,
            price: '',
            allowsImprovisation: n.allowsImprovisation,
            categoryIds: n.categoryIds,
            isSpecial: n.isSpecial,
            specialName: n.specialName ?? undefined,
            exitMode: n.exitMode,
          })),
        );
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          err instanceof CategoryTemplateApiError
            ? err.message
            : 'Не вдалося завантажити шаблон.',
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const seedCategoryIds = useMemo(
    () => [
      ...new Set(
        nominations.filter((n) => !n.isSpecial).flatMap((n) => n.categoryIds),
      ),
    ],
    [nominations],
  );

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
      const resolved = await resolveDraftCategories(
        nominations,
        [...Object.values(axes ?? {}).flat(), ...extraCategories],
      );
      await save(resolved);
    } catch (err) {
      setSubmitError(
        err instanceof CategoryTemplateApiError || err instanceof CategoryApiError
          ? err.message
          : `Не вдалося ${isEdit ? 'зберегти' : 'створити'} шаблон. Спробуйте ще раз.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const save = async (nominations: DraftNomination[]) => {
    const payload = {
      name: name.trim(),
      description: description.trim() || undefined,
      isPublic,
      nominations: nominations.map((n, index) => ({
        name: n.name.trim(),
        allowsImprovisation: n.allowsImprovisation,
        categoryIds: n.categoryIds,
        isSpecial: n.isSpecial,
        specialName: n.specialName,
        exitMode: n.exitMode,
        sortOrder: index,
      })),
    };

    const template = id
      ? await updateCategoryTemplate(id, payload)
      : await createCategoryTemplate(payload);
    showToast(
      isEdit ? `Шаблон «${template.name}» збережено` : `Шаблон «${template.name}» створено`,
    );
    setTimeout(() => navigate('/category-templates'), 700);
  };

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <>
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
          <h1>{isEdit ? 'Редагування шаблону' : 'Новий шаблон'}</h1>

          {loadError && <p className={styles.error}>{loadError}</p>}
          {submitError && <p className={styles.error}>{submitError}</p>}

          {loading ? (
            <p className={styles.hint}>Завантаження шаблону...</p>
          ) : loadError ? null : (
            <>
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
                  {nameError && (
                    <p className={styles.fieldError}>Вкажіть назву шаблону.</p>
                  )}
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
                <div
                  className={styles.visibility}
                  role="group"
                  aria-label="Видимість шаблону"
                >
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

              <NominationSetBuilder
                nominations={nominations}
                onChange={setNominations}
                selection={axes}
                onSelectionChange={setAxes}
                onNotice={showToast}
                seedCategoryIds={seedCategoryIds}
                onCategoryCreated={(category) =>
                  setExtraCategories((prev) =>
                    prev.some((c) => c.id === category.id) ? prev : [...prev, category],
                  )
                }
              />

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
                  {submitting
                    ? 'Збереження...'
                    : isEdit
                      ? 'Зберегти зміни'
                      : 'Створити шаблон'}
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      <ToastStack toasts={toasts} />
    </>
  );
}
