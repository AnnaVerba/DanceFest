import CategoryDescriptionList from '../../components/CategoryDescriptionList';
import {
  GROUP_HEADCOUNT_LABEL,
  GROUP_LINEUP_HINT,
  GROUP_LINEUP_LABEL,
  GROUP_MAX_PARTICIPANTS,
  GROUP_MIN_HEADCOUNT,
  GROUP_NAME_LABEL,
  GROUP_NAME_MAX_LENGTH,
  GROUP_NAME_PLACEHOLDER,
} from '../../lib/groupApply.constants';
import type { NominationAxisValue } from '../../lib/nominations.types';
import styles from '../ApplyPage.module.css';

interface GroupLineupFieldsProps {
  name: string;
  nameInvalid: boolean;
  // Why the name cannot be used, shown under the field.
  nameError: string | null;
  // The headcount as shown: typed by the applicant, or — while the dancers
  // are named — counted from them and not editable.
  headcount: string;
  headcountEditable: boolean;
  headcountInvalid: boolean;
  // «Група» once the headcount makes one, a dash before that.
  lineup: string;
  // What the admin wrote about the line-up the headcount falls in.
  lineupDescriptions: NominationAxisValue[];
  onNameChange: (name: string) => void;
  // Fired when the field loses focus — the name is checked then.
  onNameBlur: () => void;
  onHeadcountChange: (headcount: string) => void;
}

// What a group is called and how many dancers it has; the line-up follows
// from the headcount.
export default function GroupLineupFields({
  name,
  nameInvalid,
  nameError,
  headcount,
  headcountEditable,
  headcountInvalid,
  lineup,
  lineupDescriptions,
  onNameChange,
  onNameBlur,
  onHeadcountChange,
}: GroupLineupFieldsProps) {
  return (
    <>
      <div>
        <label className={styles.label}>
          {GROUP_NAME_LABEL} <span className={styles.req}>*</span>
        </label>
        <input
          className={`${styles.textInput} ${nameInvalid ? styles.invalid : ''}`}
          type="text"
          maxLength={GROUP_NAME_MAX_LENGTH}
          placeholder={GROUP_NAME_PLACEHOLDER}
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          onBlur={onNameBlur}
        />
        {nameError && <p className={styles.error}>{nameError}</p>}
      </div>

      <div className={styles.pair}>
        <div>
          <label className={styles.label}>
            {GROUP_HEADCOUNT_LABEL} <span className={styles.req}>*</span>
          </label>
          {headcountEditable ? (
            <input
              className={`${styles.textInput} ${
                headcountInvalid ? styles.invalid : ''
              }`}
              type="number"
              inputMode="numeric"
              min={GROUP_MIN_HEADCOUNT}
              max={GROUP_MAX_PARTICIPANTS}
              step={1}
              value={headcount}
              onChange={(e) => onHeadcountChange(e.target.value)}
            />
          ) : (
            <div className={styles.readonlyBox}>{headcount}</div>
          )}
        </div>
        <div>
          <label className={styles.label}>{GROUP_LINEUP_LABEL}</label>
          <div className={styles.readonlyBox} data-testid="lineup-value">
            {lineup}
          </div>
        </div>
      </div>

      <div>
        <p className={styles.hint}>{GROUP_LINEUP_HINT}</p>
        <CategoryDescriptionList
          values={lineupDescriptions}
          className={styles.hint}
        />
      </div>
    </>
  );
}
