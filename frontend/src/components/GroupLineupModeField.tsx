import { LINEUP_MODE, LINEUP_MODE_LABEL } from '../lib/groupApply.constants';
import type { LineupMode } from '../lib/groupApply.types';
import {
  GROUP_LINEUP_MODE_DESCRIPTION,
  GROUP_LINEUP_MODE_FIELD_NAME,
  GROUP_LINEUP_SETTING_HINT,
  GROUP_LINEUP_SETTING_LABEL,
} from './GroupLineupModeField.constants';
import styles from './GroupLineupModeField.module.css';

interface GroupLineupModeFieldProps {
  value: LineupMode;
  onChange: (mode: LineupMode) => void;
}

// The organizer's choice of how groups register: by headcount alone, or by
// naming every dancer. Used when a competition is created and edited.
export default function GroupLineupModeField({
  value,
  onChange,
}: GroupLineupModeFieldProps) {
  return (
    <fieldset className={styles.field}>
      <legend className={styles.label}>{GROUP_LINEUP_SETTING_LABEL}</legend>
      <div className={styles.options}>
        {Object.values(LINEUP_MODE).map((mode) => (
          <label
            key={mode}
            className={`${styles.option} ${value === mode ? styles.optionOn : ''}`}
          >
            <input
              type="radio"
              name={GROUP_LINEUP_MODE_FIELD_NAME}
              value={mode}
              checked={value === mode}
              onChange={() => onChange(mode)}
            />
            <strong>{LINEUP_MODE_LABEL[mode]}</strong>
            <em>{GROUP_LINEUP_MODE_DESCRIPTION[mode]}</em>
          </label>
        ))}
      </div>
      <p className={styles.hint}>{GROUP_LINEUP_SETTING_HINT}</p>
    </fieldset>
  );
}
