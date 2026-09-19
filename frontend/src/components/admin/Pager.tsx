import { useEffect } from 'react';
import type { PageNavigator } from './pager.types';
import {
  FIRST_PAGE,
  PAGER_NEXT_LABEL,
  PAGER_OF_LABEL,
  PAGER_PREV_LABEL,
  PAGER_SHOWN_LABEL,
} from './Pager.constants';
import styles from './Pager.module.css';

interface PagerProps {
  navigator: PageNavigator;
  ariaLabel: string;
}

// "Показано 1–20 з 57" plus previous/next for a server-paged list.
export default function Pager({ navigator, ariaLabel }: PagerProps) {
  const { page, pageSize, total } = navigator;
  const pageCount = Math.ceil(total / pageSize);

  // Deleting rows elsewhere can shrink the list under the current page.
  useEffect(() => {
    if (pageCount > 0 && page >= pageCount) navigator.goTo(pageCount - 1);
  }, [page, pageCount, navigator]);

  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className={styles.pager} aria-label={ariaLabel}>
      <span className={styles.range}>
        {PAGER_SHOWN_LABEL} {from}–{to} {PAGER_OF_LABEL} {total}
      </span>
      {pageCount > 1 && (
        <span className={styles.buttons}>
          <button
            type="button"
            className={styles.btn}
            disabled={page === FIRST_PAGE}
            onClick={() => navigator.goTo(page - 1)}
          >
            {PAGER_PREV_LABEL}
          </button>
          <span className={styles.range}>
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={styles.btn}
            disabled={page >= pageCount - 1}
            onClick={() => navigator.goTo(page + 1)}
          >
            {PAGER_NEXT_LABEL}
          </button>
        </span>
      )}
    </nav>
  );
}
