import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import FinanceGroupTable from './FinanceGroupTable';
import { getFinanceSummary } from '../../lib/finance';
import { formatEntryAmount } from '../../lib/entryAmount';
import { queryKeys } from '../../lib/queryKeys';
import { FINANCE_STALE_TIME_MS } from '../../lib/queryClient.constants';
import {
  FINANCE_EMPTY_MESSAGE,
  FINANCE_LOAD_ERROR_MESSAGE,
  FINANCE_SECTIONS,
  FINANCE_TOTAL_LABEL,
} from './FinancePanel.constants';
import styles from './FinancePanel.module.css';

interface FinancePanelProps {
  competitionId: string;
  onError: (message: string) => void;
}

// What each dancer, trainer and studio owes for the competition. An entry
// costs its per-person nomination price × dancers plus any fee from
// «Доплати».
export default function FinancePanel({ competitionId, onError }: FinancePanelProps) {
  const summaryQuery = useQuery({
    queryKey: queryKeys.financeSummary(competitionId),
    queryFn: () => getFinanceSummary(competitionId),
    staleTime: FINANCE_STALE_TIME_MS,
  });
  const summary = summaryQuery.data ?? null;

  useEffect(() => {
    if (summaryQuery.isError) onError(FINANCE_LOAD_ERROR_MESSAGE);
  }, [summaryQuery.isError, onError]);

  return (
    <section className={styles.panel}>
      {summaryQuery.isLoading && <p className={styles.status}>Завантаження...</p>}

      {summary && summary.entriesCount === 0 && (
        <p className={styles.empty}>{FINANCE_EMPTY_MESSAGE}</p>
      )}

      {summary && summary.entriesCount > 0 && (
        <>
          <div className={styles.total}>
            <span className={styles.totalLabel}>{FINANCE_TOTAL_LABEL}</span>
            <span className={styles.totalValue}>{formatEntryAmount(summary.total)}</span>
          </div>
          {FINANCE_SECTIONS.map((section) => (
            <FinanceGroupTable
              key={section.group}
              competitionId={competitionId}
              section={section}
              onError={onError}
            />
          ))}
        </>
      )}
    </section>
  );
}
