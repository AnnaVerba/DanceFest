import {
  ROUTINE_TITLE_HINT,
  ROUTINE_TITLE_LABEL,
  ROUTINE_TITLE_MAX_LENGTH,
  ROUTINE_TITLE_PLACEHOLDER,
} from '../../lib/applyRoutineTitle.constants';
import styles from '../ApplyPage.module.css';

interface RoutineTitleFieldProps {
  value: string;
  onChange: (title: string) => void;
}

// The optional title of a solo, duo or trio number.
export default function RoutineTitleField({
  value,
  onChange,
}: RoutineTitleFieldProps) {
  return (
    <div className={styles.spaced}>
      <label className={styles.label}>{ROUTINE_TITLE_LABEL}</label>
      <input
        className={styles.textInput}
        type="text"
        maxLength={ROUTINE_TITLE_MAX_LENGTH}
        placeholder={ROUTINE_TITLE_PLACEHOLDER}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className={styles.hint}>{ROUTINE_TITLE_HINT}</p>
    </div>
  );
}
