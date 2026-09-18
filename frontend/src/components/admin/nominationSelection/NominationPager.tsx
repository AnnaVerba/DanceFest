import { useEffect } from 'react';
import {
  FIRST_PAGE,
  PAGER_ARIA_LABEL,
  PAGER_NEXT_LABEL,
  PAGER_OF_LABEL,
  PAGER_PREV_LABEL,
  PAGER_SHOWN_LABEL,
} from './nominationFilters.constants';
import type { NominationSelection } from './nominationSelection.types';
import styles from './NominationPager.module.css';

interface NominationPagerProps {
  selection: NominationSelection;
  total: number;
}

export default function NominationPager({ selection, total }: NominationPagerProps) {
  const { page, pageSize } = selection.pageQuery;
  const pageCount = Math.ceil(total / pageSize);

  // Deleting or moving nominations can shrink the list under the last page.
  useEffect(() => {
    if (pageCount > 0 && page >= pageCount) selection.setPage(pageCount - 1);
  }, [page, pageCount, selection]);

  if (total === 0) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);

  return (
    <nav className={styles.pager} aria-label={PAGER_ARIA_LABEL}>
      <span className={styles.range}>
        {PAGER_SHOWN_LABEL} {from}–{to} {PAGER_OF_LABEL} {total}
      </span>
      {pageCount > 1 && (
        <span className={styles.buttons}>
          <button
            type="button"
            className={styles.btn}
            disabled={page === FIRST_PAGE}
            onClick={() => selection.setPage(page - 1)}
          >
            {PAGER_PREV_LABEL}
          </button>
          <span className={styles.pageOf}>
            {page + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={styles.btn}
            disabled={page >= pageCount - 1}
            onClick={() => selection.setPage(page + 1)}
          >
            {PAGER_NEXT_LABEL}
          </button>
        </span>
      )}
    </nav>
  );
}
