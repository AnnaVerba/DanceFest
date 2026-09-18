import type { ReactNode } from 'react';
import {
  CLEAR_SELECTION_LABEL,
  SELECTED_COUNT_LABEL,
  SELECT_ALL_FILTERED_LABEL,
} from './nominationFilters.constants';
import type { NominationSelection } from './nominationSelection.types';
import styles from './NominationBulkBar.module.css';

interface NominationBulkBarProps {
  selection: NominationSelection;
  // Nominations matching the current filter, across all pages.
  total: number;
  // Bulk actions, shown once something is selected.
  children: ReactNode;
}

export default function NominationBulkBar({
  selection,
  total,
  children,
}: NominationBulkBarProps) {
  if (total === 0) return null;
  const selectedCount = selection.selectedCount(total);

  return (
    <div className={styles.bulkBar}>
      <label className={styles.selectAll}>
        <input
          type="checkbox"
          checked={selection.allFilteredSelected}
          onChange={selection.toggleSelectAll}
        />
        {SELECT_ALL_FILTERED_LABEL} ({total})
      </label>
      {selectedCount > 0 && (
        <>
          <span className={styles.count}>
            {SELECTED_COUNT_LABEL} {selectedCount}
          </span>
          <button type="button" className={styles.btnLink} onClick={selection.clearSelection}>
            {CLEAR_SELECTION_LABEL}
          </button>
          {children}
        </>
      )}
    </div>
  );
}
