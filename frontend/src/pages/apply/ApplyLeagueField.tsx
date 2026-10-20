import CategoryDescriptionList from '../../components/CategoryDescriptionList';
import {
  LEAGUE_HINT,
  LEAGUE_LABEL,
  LEAGUE_PLACEHOLDER,
} from '../../lib/applyLeague.constants';
import type { NominationAxisValue } from '../../lib/nominations.types';
import styles from '../ApplyPage.module.css';

interface ApplyLeagueFieldProps {
  value: string;
  options: string[];
  invalid: boolean;
  // What the admin wrote about the picked league, shown under the field.
  descriptions: NominationAxisValue[];
  onChange: (league: string) => void;
}

// The league an application is filed in — picked per application.
export default function ApplyLeagueField({
  value,
  options,
  invalid,
  descriptions,
  onChange,
}: ApplyLeagueFieldProps) {
  return (
    <div>
      <label className={styles.label}>
        {LEAGUE_LABEL} <span className={styles.req}>*</span>
      </label>
      <select
        className={`${styles.select} ${invalid ? styles.invalid : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{LEAGUE_PLACEHOLDER}</option>
        {options.map((league) => (
          <option key={league} value={league}>
            {league}
          </option>
        ))}
      </select>
      <p className={styles.hint}>{LEAGUE_HINT}</p>
      <CategoryDescriptionList values={descriptions} className={styles.hint} />
    </div>
  );
}
