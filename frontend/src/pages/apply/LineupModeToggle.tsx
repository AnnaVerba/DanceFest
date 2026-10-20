import {
  GROUP_LINEUP_MODE_LABEL,
  LINEUP_MODE,
  LINEUP_MODE_LABEL,
} from '../../lib/groupApply.constants';
import type { LineupMode } from '../../lib/groupApply.types';
import styles from '../ApplyPage.module.css';

interface LineupModeToggleProps {
  mode: LineupMode;
  onChange: (mode: LineupMode) => void;
}

// How a group gives its line-up: only the headcount, or dancer by dancer.
export default function LineupModeToggle({
  mode,
  onChange,
}: LineupModeToggleProps) {
  return (
    <div>
      <label className={styles.label}>{GROUP_LINEUP_MODE_LABEL}</label>
      <div className={styles.toggle}>
        {Object.values(LINEUP_MODE).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => onChange(option)}
          >
            {LINEUP_MODE_LABEL[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
