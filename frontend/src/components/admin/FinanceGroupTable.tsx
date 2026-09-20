import { useEffect, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import Pager from './Pager';
import { FIRST_PAGE } from './Pager.constants';
import { getFinanceGroup } from '../../lib/finance';
import type { FinanceGroupQuery } from '../../lib/finance.types';
import { formatEntryAmount } from '../../lib/entryAmount';
import { queryKeys } from '../../lib/queryKeys';
import { FINANCE_STALE_TIME_MS } from '../../lib/queryClient.constants';
import {
  FINANCE_AMOUNT_LABEL,
  FINANCE_COLUMN_COUNT,
  FINANCE_ENTRIES_COUNT_LABEL,
  FINANCE_LOAD_ERROR_MESSAGE,
  FINANCE_NO_MATCHES_MESSAGE,
  FINANCE_PAGE_SIZE,
  FINANCE_SEARCH_DEBOUNCE_MS,
  FINANCE_UNSPECIFIED_NAME,
} from './FinancePanel.constants';
import type { FinanceSectionConfig } from './FinancePanel.types';
import styles from './FinancePanel.module.css';

interface FinanceGroupTableProps {
  competitionId: string;
  section: FinanceSectionConfig;
  onError: (message: string) => void;
}

// One collapsible breakdown (studios, trainers or dancers), searched and
// paged on the server. Starts collapsed and requests nothing until the
// organizer opens it; collapsing keeps the search and page.
export default function FinanceGroupTable({
  competitionId,
  section,
  onError,
}: FinanceGroupTableProps) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(FIRST_PAGE);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(FIRST_PAGE);
    }, FINANCE_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  const query: FinanceGroupQuery = {
    page,
    pageSize: FINANCE_PAGE_SIZE,
    search: debouncedSearch || undefined,
  };
  const groupQuery = useQuery({
    queryKey: queryKeys.financeGroup(competitionId, section.group, query),
    queryFn: () => getFinanceGroup(competitionId, section.group, query),
    staleTime: FINANCE_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    enabled: open,
  });
  const rows = groupQuery.data?.rows ?? [];
  const total = groupQuery.data?.total ?? 0;

  useEffect(() => {
    if (groupQuery.isError) onError(FINANCE_LOAD_ERROR_MESSAGE);
  }, [groupQuery.isError, onError]);

  return (
    <div className={styles.section}>
      <div className={styles.sectionHead}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          onClick={() => setOpen((prev) => !prev)}
        >
          <svg
            className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M9 6l6 6-6 6" />
          </svg>
          <span className={styles.sectionTitle}>{section.title}</span>
        </button>
        {open && (
          <input
            className={styles.search}
            type="search"
            placeholder={section.searchPlaceholder}
            aria-label={section.searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}
      </div>

      {open && (
        <>
          {section.note && <p className={styles.note}>{section.note}</p>}
          {groupQuery.isLoading && <p className={styles.status}>Завантаження...</p>}
          {groupQuery.data && (
            <div className={styles.tableBlock}>
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th scope="col">{section.nameLabel}</th>
                      <th scope="col" className={styles.numCol}>
                        {FINANCE_ENTRIES_COUNT_LABEL}
                      </th>
                      <th scope="col" className={styles.numCol}>
                        {FINANCE_AMOUNT_LABEL}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 && (
                      <tr>
                        <td colSpan={FINANCE_COLUMN_COUNT} className={styles.noMatches}>
                          {FINANCE_NO_MATCHES_MESSAGE}
                        </td>
                      </tr>
                    )}
                    {rows.map((row) => (
                      <tr key={row.key}>
                        <td className={row.name ? styles.name : styles.unspecified}>
                          {row.name ?? FINANCE_UNSPECIFIED_NAME}
                        </td>
                        <td className={styles.numCol}>{row.entriesCount}</td>
                        <td className={`${styles.numCol} ${styles.amount}`}>
                          {formatEntryAmount(row.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pager
                navigator={{ page, pageSize: FINANCE_PAGE_SIZE, total, goTo: setPage }}
                ariaLabel={section.title}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
