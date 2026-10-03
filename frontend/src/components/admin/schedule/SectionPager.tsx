import type { SectionPageNavigator } from './sectionPager.types';
import {
  SECTION_PAGER_FIRST_PAGE,
  SECTION_PAGER_NEXT_LABEL,
  SECTION_PAGER_OF_LABEL,
  SECTION_PAGER_PREV_LABEL,
  SECTION_PAGER_RANGE_LABEL,
} from './sectionPager.constants';
import styles from './program.module.css';

interface SectionPagerProps {
  navigator: SectionPageNavigator;
}

// "Відділення 1–5 з 40" plus previous/next over section-aligned pages.
export default function SectionPager({ navigator }: SectionPagerProps) {
  const { page, pageCount, rangeStart, rangeEnd, totalSections } = navigator;
  if (pageCount <= 1) return null;

  return (
    <div className={styles.filterRow}>
      <button
        type="button"
        className={styles.ghostBtn}
        disabled={page <= SECTION_PAGER_FIRST_PAGE}
        onClick={() => navigator.goTo(page - 1)}
      >
        {SECTION_PAGER_PREV_LABEL}
      </button>
      <span className={styles.muted}>
        {SECTION_PAGER_RANGE_LABEL} {rangeStart}–{rangeEnd}{' '}
        {SECTION_PAGER_OF_LABEL} {totalSections}
      </span>
      <button
        type="button"
        className={styles.ghostBtn}
        disabled={page >= pageCount - 1}
        onClick={() => navigator.goTo(page + 1)}
      >
        {SECTION_PAGER_NEXT_LABEL}
      </button>
    </div>
  );
}
