import { useState } from 'react';
import type { FinanceGroupRow } from '../../lib/finance.types';
import { formatEntryAmount } from '../../lib/entryAmount';
import {
  FINANCE_HEAD_OWN_DANCERS_NAME,
  FINANCE_HIDE_TRAINERS_LABEL,
  FINANCE_SHOW_TRAINERS_LABEL,
  FINANCE_UNSPECIFIED_NAME,
} from './FinancePanel.constants';
import styles from './FinancePanel.module.css';

interface FinanceGroupRowViewProps {
  row: FinanceGroupRow;
}

// One finance row. A studio head's row with trainers folds out into what
// the head's own dancers and each trainer's dancers owe.
export default function FinanceGroupRowView({ row }: FinanceGroupRowViewProps) {
  const [open, setOpen] = useState(false);
  const toggleLabel = open
    ? FINANCE_HIDE_TRAINERS_LABEL
    : FINANCE_SHOW_TRAINERS_LABEL;

  return (
    <>
      <tr>
        <td className={row.name ? styles.name : styles.unspecified}>
          {row.name ?? FINANCE_UNSPECIFIED_NAME}
          {row.trainers && (
            <button
              type="button"
              className={styles.trainersToggle}
              aria-expanded={open}
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={() => setOpen((prev) => !prev)}
            >
              {open ? '−' : '+'}
            </button>
          )}
        </td>
        <td className={styles.numCol}>{row.entriesCount}</td>
        <td className={`${styles.numCol} ${styles.amount}`}>
          {formatEntryAmount(row.amount)}
        </td>
      </tr>
      {open &&
        row.trainers?.map((trainer) => (
          <tr key={trainer.key}>
            <td className={styles.trainerName}>
              {trainer.name ?? FINANCE_HEAD_OWN_DANCERS_NAME}
            </td>
            <td className={styles.numCol}>{trainer.entriesCount}</td>
            <td className={styles.numCol}>
              {formatEntryAmount(trainer.amount)}
            </td>
          </tr>
        ))}
    </>
  );
}
