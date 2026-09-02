import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AdminHeader from '../components/AdminHeader';
import ConfirmDialog from '../components/admin/ConfirmDialog';
import { ToastStack } from '../components/admin/Toast';
import { useToasts } from '../components/admin/useToasts';
import { getStoredAdmin, getToken } from '../lib/auth';
import {
  CategoryTemplateApiError,
  deleteCategoryTemplate,
  forkCategoryTemplate,
  getCategoryTemplate,
  getCategoryTemplates,
} from '../lib/categoryTemplates';
import type {
  CategoryTemplate,
  TemplateNomination,
} from '../lib/categoryTemplates';
import styles from './CategoryTemplatesPage.module.css';

type Scope = 'all' | 'mine' | 'public';

function plural(n: number): string {
  const d10 = n % 10;
  const d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return 'номінація';
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return 'номінації';
  return 'номінацій';
}

export default function CategoryTemplatesPage() {
  const admin = getStoredAdmin();

  const [templates, setTemplates] = useState<CategoryTemplate[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nominationsById, setNominationsById] = useState<
    Record<string, TemplateNomination[]>
  >({});
  const [pendingDelete, setPendingDelete] = useState<CategoryTemplate | null>(null);
  const { toasts, showToast } = useToasts();

  const loadTemplates = () => {
    getCategoryTemplates()
      .then(setTemplates)
      .catch(() => setLoadError('Не вдалося завантажити шаблони.'));
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const filtered = useMemo(() => {
    const list = templates ?? [];
    const q = search.trim().toLowerCase();
    return list.filter((t) => {
      if (scope === 'public' && !t.isPublic) return false;
      if (scope === 'mine' && t.author?.id !== admin?.id) return false;
      if (q && !(t.name + ' ' + (t.description ?? '')).toLowerCase().includes(q)) return false;
      return true;
    });
  }, [templates, search, scope, admin?.id]);

  const toggleExpanded = async (template: CategoryTemplate) => {
    if (expandedId === template.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(template.id);
    if (nominationsById[template.id]) return;

    try {
      const detail = await getCategoryTemplate(template.id);
      setNominationsById((prev) => ({ ...prev, [template.id]: detail.nominations }));
    } catch (err) {
      showToast(
        err instanceof CategoryTemplateApiError
          ? err.message
          : 'Не вдалося завантажити номінації шаблону.',
      );
    }
  };

  const handleFork = async (template: CategoryTemplate) => {
    try {
      const copy = await forkCategoryTemplate(
        template.id,
        `${template.name} (моя версія)`,
      );
      setTemplates((prev) => (prev ? [copy, ...prev] : [copy]));
      showToast(`Створено вашу копію «${copy.name}»`);
    } catch (err) {
      showToast(
        err instanceof CategoryTemplateApiError
          ? err.message
          : 'Не вдалося створити копію шаблону.',
      );
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteCategoryTemplate(pendingDelete.id);
      setTemplates((prev) => prev?.filter((t) => t.id !== pendingDelete.id) ?? prev);
      showToast(`Шаблон «${pendingDelete.name}» видалено`);
    } catch (err) {
      showToast(
        err instanceof CategoryTemplateApiError
          ? err.message
          : 'Не вдалося видалити шаблон.',
      );
    } finally {
      setPendingDelete(null);
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
          <div className={styles.pageHead}>
            <div>
              <h1 className={styles.pageTitle}>Шаблони категорій</h1>
              <p className={styles.lead}>
                Багаторазові набори критеріїв для генерації категорій конкурсу.
              </p>
            </div>
            <span className={styles.spacer} />
            <Link to="/category-templates/new" className={styles.btnPrimary}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 8v8M8 12h8" />
              </svg>
              Створити шаблон
            </Link>
          </div>

          <div className={styles.toolbar}>
            <input
              className={styles.search}
              type="text"
              placeholder="Пошук шаблонів..."
              aria-label="Пошук шаблонів"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className={styles.segmented} role="group" aria-label="Фільтр шаблонів">
              <button
                type="button"
                aria-pressed={scope === 'all'}
                onClick={() => setScope('all')}
              >
                Усі
              </button>
              <button
                type="button"
                aria-pressed={scope === 'mine'}
                onClick={() => setScope('mine')}
              >
                Мої
              </button>
              <button
                type="button"
                aria-pressed={scope === 'public'}
                onClick={() => setScope('public')}
              >
                Публічні
              </button>
            </div>
          </div>

          {loadError && <p className={styles.empty}>{loadError}</p>}

          {!loadError && templates === null && <p className={styles.empty}>Завантаження...</p>}

          {!loadError && templates !== null && filtered.length === 0 && (
            <p className={styles.empty}>
              Шаблонів не знайдено. Змініть запит або створіть новий шаблон.
            </p>
          )}

          {!loadError && templates !== null && filtered.length > 0 && (
            <div className={styles.grid}>
              {filtered.map((t) => {
                const count = t.nominationsCount;
                return (
                  <article key={t.id} className={styles.tpl}>
                    <div className={styles.tplHead}>
                      <h2>{t.name}</h2>
                      <span
                        className={`${styles.badge} ${
                          t.isPublic ? styles.badgePub : styles.badgePriv
                        }`}
                      >
                        {t.isPublic ? 'Публічний' : 'Приватний'}
                      </span>
                    </div>
                    {t.description && <p className={styles.desc}>{t.description}</p>}
                    <p className={styles.meta}>
                      {count} {plural(count)} · автор: {t.author?.name ?? '—'}
                    </p>

                    {expandedId === t.id && (
                      <ul className={styles.nomList}>
                        {nominationsById[t.id] === undefined ? (
                          <li>Завантаження...</li>
                        ) : nominationsById[t.id].length === 0 ? (
                          <li>Шаблон порожній</li>
                        ) : (
                          nominationsById[t.id].map((nomination) => (
                            <li key={nomination.id}>
                              {nomination.name}
                              {nomination.allowsImprovisation && ' · імпровізація'}
                            </li>
                          ))
                        )}
                      </ul>
                    )}

                    <div className={styles.tplActions}>
                      <Link
                        to={`/competitions/new?template=${t.id}`}
                        className={styles.btnGold}
                      >
                        Використати
                      </Link>
                      <button
                        type="button"
                        className={styles.btn}
                        aria-expanded={expandedId === t.id}
                        onClick={() => void toggleExpanded(t)}
                      >
                        Номінації
                      </button>
                      {t.author?.id === admin?.id && (
                        <Link
                          to={`/category-templates/${t.id}/edit`}
                          className={styles.linkMuted}
                        >
                          Редагувати
                        </Link>
                      )}
                    </div>
                    <div className={styles.tplLinks}>
                      <button
                        type="button"
                        className={styles.link}
                        onClick={() => void handleFork(t)}
                      >
                        {t.author?.id === admin?.id ? 'Дублювати' : 'Зберегти як мою копію'}
                      </button>
                      {t.author?.id === admin?.id && (
                        <button
                          type="button"
                          className={styles.linkDanger}
                          onClick={() => setPendingDelete(t)}
                        >
                          Видалити
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Видалити шаблон?"
        description={
          pendingDelete
            ? `Видалити «${pendingDelete.name}»? Цю дію не можна скасувати.`
            : ''
        }
        confirmLabel="Видалити"
        onCancel={() => setPendingDelete(null)}
        onConfirm={handleDelete}
      />

      <ToastStack toasts={toasts} />
    </>
  );
}
