import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, Navigate } from 'react-router-dom';
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
import type { CategoryTemplate, TemplateNomination } from '../lib/categoryTemplates';
import { queryKeys } from '../lib/queryKeys';
import { REFERENCE_STALE_TIME_MS } from '../lib/queryClient.constants';
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
  const queryClient = useQueryClient();

  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [scope, setScope] = useState<Scope>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nominationsById, setNominationsById] = useState<
    Record<string, TemplateNomination[]>
  >({});
  const [pendingDelete, setPendingDelete] = useState<CategoryTemplate | null>(null);
  const { toasts, showToast } = useToasts();

  const TEMPLATES_PAGE_SIZE = 20;

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const templatesQuery = useQuery({
    queryKey: queryKeys.categoryTemplates({
      page,
      pageSize: TEMPLATES_PAGE_SIZE,
      search: debouncedSearch || undefined,
    }),
    queryFn: () =>
      getCategoryTemplates({
        page,
        pageSize: TEMPLATES_PAGE_SIZE,
        search: debouncedSearch || undefined,
      }),
    staleTime: REFERENCE_STALE_TIME_MS,
  });
  const templates = templatesQuery.data?.rows ?? null;
  const total = templatesQuery.data?.total ?? 0;
  const loadError = templatesQuery.isError ? 'Не вдалося завантажити шаблони.' : null;

  const templatesPageCount = Math.max(
    1,
    Math.ceil(total / TEMPLATES_PAGE_SIZE),
  );

  const filtered = useMemo(() => {
    const list = templates ?? [];
    return list.filter((t) => {
      if (scope === 'public' && !t.isPublic) return false;
      if (scope === 'mine' && t.author?.id !== admin?.id) return false;
      return true;
    });
  }, [templates, scope, admin?.id]);

  const toggleExpanded = async (template: CategoryTemplate) => {
    if (expandedId === template.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(template.id);
    if (nominationsById[template.id]) return;

    try {
      // Template contents are a reference too (staleTime: Infinity) — this
      // reuses the shared cache instead of always hitting the network.
      const detail = await queryClient.fetchQuery({
        queryKey: queryKeys.categoryTemplate(template.id),
        queryFn: () => getCategoryTemplate(template.id),
        staleTime: REFERENCE_STALE_TIME_MS,
      });
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
      // Prefix, not just this query: other cached pages/search terms of
      // this Infinity-cached list need the same nudge.
      await queryClient.invalidateQueries({ queryKey: ['category-templates'] });
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
      queryClient.removeQueries({ queryKey: queryKeys.categoryTemplate(pendingDelete.id) });
      // Prefix, not just this query: other cached pages/search terms of
      // this Infinity-cached list need the same nudge.
      await queryClient.invalidateQueries({ queryKey: ['category-templates'] });
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
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

          {!loadError && templates !== null && templatesPageCount > 1 && (
            <div className={styles.pager}>
              <button
                type="button"
                className={styles.btn}
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                ‹ Попередні
              </button>
              <span>
                Сторінка {page + 1} з {templatesPageCount}
              </span>
              <button
                type="button"
                className={styles.btn}
                disabled={page >= templatesPageCount - 1}
                onClick={() =>
                  setPage((p) => Math.min(templatesPageCount - 1, p + 1))
                }
              >
                Наступні ›
              </button>
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
