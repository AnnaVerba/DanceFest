import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useParams } from 'react-router-dom';
import { getToken } from '../lib/auth';
import {
  CategoryTemplateApiError,
  getCategoryTemplateMeta,
  getCategoryTemplateNominations,
} from '../lib/categoryTemplates';
import { pluralNominations } from '../lib/nominationSet';
import { queryKeys } from '../lib/queryKeys';
import { ENTRY_AMOUNT_CURRENCY } from '../lib/entryAmount.constants';
import { REFERENCE_STALE_TIME_MS } from '../lib/queryClient.constants';
import {
  NO_TEMPLATE_PRICE_LABEL,
  TEMPLATE_NOMINATIONS_PAGE_SIZE,
} from './CategoryTemplateDetailPage.constants';
import styles from './CategoryTemplatesPage.module.css';

export default function CategoryTemplateDetailPage() {
  const { id = '' } = useParams();
  const [page, setPage] = useState(0);

  const metaQuery = useQuery({
    queryKey: queryKeys.categoryTemplateMeta(id),
    queryFn: () => getCategoryTemplateMeta(id),
    staleTime: REFERENCE_STALE_TIME_MS,
  });

  const nominationsQuery = useQuery({
    queryKey: queryKeys.categoryTemplateNominations(id, {
      page,
      pageSize: TEMPLATE_NOMINATIONS_PAGE_SIZE,
    }),
    queryFn: () =>
      getCategoryTemplateNominations(id, {
        page,
        pageSize: TEMPLATE_NOMINATIONS_PAGE_SIZE,
      }),
    staleTime: REFERENCE_STALE_TIME_MS,
  });

  if (!getToken()) {
    return <Navigate to="/login" replace />;
  }

  const meta = metaQuery.data;
  const nominations = nominationsQuery.data;
  const pageCount = nominations ? Math.max(1, Math.ceil(nominations.total / TEMPLATE_NOMINATIONS_PAGE_SIZE)) : 1;

  const notFound =
    metaQuery.isError &&
    metaQuery.error instanceof CategoryTemplateApiError &&
    metaQuery.error.status === 404;

  return (
    <main className={styles.main}>
      <div className={styles.wrap}>
        <p className={styles.meta}>
          <Link to="/category-templates">← Усі шаблони</Link>
        </p>

        {metaQuery.isLoading && <p className={styles.empty}>Завантаження...</p>}
        {notFound && <p className={styles.empty}>Шаблон не знайдено.</p>}
        {metaQuery.isError && !notFound && (
          <p className={styles.empty}>Не вдалося завантажити шаблон.</p>
        )}

        {meta && (
          <>
            <div className={styles.pageHead}>
              <div>
                <h1 className={styles.pageTitle}>{meta.name}</h1>
                {meta.description && <p className={styles.lead}>{meta.description}</p>}
              </div>
              <span
                className={`${styles.badge} ${
                  meta.isPublic ? styles.badgePub : styles.badgePriv
                }`}
              >
                {meta.isPublic ? 'Публічний' : 'Приватний'}
              </span>
            </div>
            <p className={styles.meta}>
              {meta.nominationsCount} {pluralNominations(meta.nominationsCount)} ·
              автор: {meta.author?.name ?? '—'}
            </p>

            {nominationsQuery.isLoading && <p className={styles.empty}>Завантаження...</p>}
            {nominationsQuery.isError && (
              <p className={styles.empty}>Не вдалося завантажити номінації.</p>
            )}
            {nominations && nominations.rows.length === 0 && (
              <p className={styles.empty}>Шаблон порожній.</p>
            )}

            {nominations && nominations.rows.length > 0 && (
              <ul className={styles.nomList}>
                {nominations.rows.map((nomination) => (
                  <li key={nomination.id}>
                    <span className={styles.nomName}>
                      {nomination.name}
                      {nomination.allowsImprovisation && ' · імпровізація'}
                    </span>
                    <span
                      className={styles.nomPrice}
                      data-empty={nomination.effectivePrice === null}
                    >
                      {nomination.effectivePrice === null
                        ? NO_TEMPLATE_PRICE_LABEL
                        : `${nomination.effectivePrice} ${ENTRY_AMOUNT_CURRENCY}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {pageCount > 1 && (
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
                  Сторінка {page + 1} з {pageCount}
                </span>
                <button
                  type="button"
                  className={styles.btn}
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                >
                  Наступні ›
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
