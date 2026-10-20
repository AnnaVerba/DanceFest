import {
  APPLY_TAB,
  APPLY_TAB_LABEL,
  APPLY_TABS_ARIA_LABEL,
} from '../../lib/applyTabs.constants';
import type { ApplyTab } from '../../lib/applyTabs.types';
import styles from '../ApplyPage.module.css';

interface ApplyTabsProps {
  activeTab: ApplyTab;
  onChange: (tab: ApplyTab) => void;
}

// Switches the apply form between a solo/duo/trio and a group registration.
export default function ApplyTabs({ activeTab, onChange }: ApplyTabsProps) {
  return (
    <div className={styles.tabs} role="tablist" aria-label={APPLY_TABS_ARIA_LABEL}>
      {Object.values(APPLY_TAB).map((tab) => (
        <button
          key={tab}
          type="button"
          role="tab"
          aria-selected={activeTab === tab}
          className={styles.tab}
          onClick={() => onChange(tab)}
        >
          {APPLY_TAB_LABEL[tab]}
        </button>
      ))}
    </div>
  );
}
