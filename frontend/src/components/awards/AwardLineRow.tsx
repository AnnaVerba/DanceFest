import { useState } from 'react';
import {
  AWARD_QUANTITY_STEP,
  MIN_AWARD_QUANTITY,
} from '../../lib/awards.constants';
import type { AwardLine } from '../../lib/awards.types';
import {
  CALCULATED_PREFIX,
  RESET_LABEL,
  SAVE_LABEL,
} from './AwardsSummary.constants';
import styles from './AwardsSummary.module.css';

interface AwardLineRowProps {
  line: AwardLine;
  label: string;
  disabled: boolean;
  onSave: (key: string, value: number | null) => void;
}

// The parent keys this row on key + override + calculated, so a fresh
// report remounts it with a fresh draft — no state syncing effect.
export default function AwardLineRow({
  line,
  label,
  disabled,
  onSave,
}: AwardLineRowProps) {
  const shown = line.override ?? line.calculated;
  const [draft, setDraft] = useState(String(shown));

  const parsed = Number(draft);
  const valid =
    draft.trim() !== '' &&
    Number.isInteger(parsed) &&
    parsed >= MIN_AWARD_QUANTITY;
  const dirty = valid && parsed !== shown;
  const overridden = line.override !== null;

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <input
        type="number"
        min={MIN_AWARD_QUANTITY}
        step={AWARD_QUANTITY_STEP}
        aria-label={label}
        className={`${styles.input} ${overridden ? styles.inputOverridden : ''}`}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
      />
      {dirty && (
        <button
          type="button"
          className={styles.button}
          disabled={disabled}
          onClick={() => onSave(line.key, parsed)}
        >
          {SAVE_LABEL}
        </button>
      )}
      {overridden && (
        <>
          <span className={styles.hint}>
            {CALCULATED_PREFIX} {line.calculated}
          </span>
          <button
            type="button"
            className={styles.linkButton}
            disabled={disabled}
            onClick={() => onSave(line.key, null)}
          >
            {RESET_LABEL}
          </button>
        </>
      )}
    </div>
  );
}
