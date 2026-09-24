import { formatContestDateRange } from '../lib/homeContests';
import styles from './ContestTitle.module.css';

interface ContestTitleProps {
  name: string;
  dateFrom: string;
  dateTo: string;
}

// The competition's name with its start–end dates right beneath it.
export default function ContestTitle({ name, dateFrom, dateTo }: ContestTitleProps) {
  return (
    <div className={styles.title}>
      <h1>{name}</h1>
      <p className={styles.dates}>{formatContestDateRange(dateFrom, dateTo)}</p>
    </div>
  );
}
