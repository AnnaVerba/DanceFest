import { formatDuration } from '../../lib/duration';
import {
  OVERAGE_MARK_HINT,
  OVERAGE_MARK_PREFIX,
  PURCHASED_MARK_PREFIX,
} from './DurationMarks.constants';
import styles from './DurationMarks.module.css';

interface DurationMarksProps {
  overageSeconds: number;
  purchasedSeconds: number;
}

// An exit's time notes next to its duration: the uncounted overage in red,
// and the extra time already purchased. Nothing when neither applies.
export default function DurationMarks({
  overageSeconds,
  purchasedSeconds,
}: DurationMarksProps) {
  if (overageSeconds <= 0 && purchasedSeconds <= 0) return null;
  return (
    <span className={styles.marks}>
      {overageSeconds > 0 && (
        <span
          className={`${styles.mark} ${styles.overage}`}
          title={OVERAGE_MARK_HINT}
        >
          {OVERAGE_MARK_PREFIX}
          {formatDuration(overageSeconds)}
        </span>
      )}
      {purchasedSeconds > 0 && (
        <span className={`${styles.mark} ${styles.purchased}`}>
          {PURCHASED_MARK_PREFIX}
          {formatDuration(purchasedSeconds)}
        </span>
      )}
    </span>
  );
}
