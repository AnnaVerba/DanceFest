import {
  AGE_CATEGORY_LABEL,
  AGE_CATEGORY_PLACEHOLDER,
  NO_COMMON_AGE_CATEGORY_HINT,
} from '../../lib/applyAge.constants';
import { GROUP_AGE_AUTOMATIC_HINT } from '../../lib/groupAge.constants';
import type { NominationCategoryRange } from '../../lib/nominations';
import styles from '../ApplyPage.module.css';

interface ApplyAgeFieldProps {
  // The age categories the dancers fit — all of them while none is named.
  options: NominationCategoryRange[];
  value: string;
  // What the admin wrote about each category, shown in its option.
  descriptions: Map<string, string | null>;
  // Shown when the competition has no age category to pick from.
  fallbackLabel: string;
  // Dancers are named, yet no category fits all of them.
  noCommonCategory: boolean;
  // The category follows from the dancers' ages — shown, not picked.
  automatic?: boolean;
  onChange: (ageCategory: string) => void;
}

// The age category a number is registered in; it narrows the nominations.
export default function ApplyAgeField({
  options,
  value,
  descriptions,
  fallbackLabel,
  noCommonCategory,
  automatic = false,
  onChange,
}: ApplyAgeFieldProps) {
  const decided = options.find((category) => category.name === value);
  if (automatic) {
    return (
      <div>
        <label className={styles.label}>{AGE_CATEGORY_LABEL}</label>
        <div className={styles.readonlyBox}>
          {decided
            ? `${decided.name} (${decided.rangeFrom}–${decided.rangeTo})`
            : fallbackLabel}
        </div>
        <p className={styles.hint}>{GROUP_AGE_AUTOMATIC_HINT}</p>
        {noCommonCategory && (
          <p className={styles.hint}>{NO_COMMON_AGE_CATEGORY_HINT}</p>
        )}
      </div>
    );
  }
  return (
    <div>
      <label className={styles.label}>{AGE_CATEGORY_LABEL}</label>
      {options.length > 0 ? (
        <select
          className={styles.select}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {options.length > 1 && (
            <option value="">{AGE_CATEGORY_PLACEHOLDER}</option>
          )}
          {options.map((c) => {
            const description = descriptions.get(c.name);
            return (
              <option key={c.name} value={c.name}>
                {c.name} ({c.rangeFrom}–{c.rangeTo})
                {description ? ` — ${description}` : ''}
              </option>
            );
          })}
        </select>
      ) : (
        <div className={styles.readonlyBox}>{fallbackLabel}</div>
      )}
      {noCommonCategory && (
        <p className={styles.hint}>{NO_COMMON_AGE_CATEGORY_HINT}</p>
      )}
    </div>
  );
}
