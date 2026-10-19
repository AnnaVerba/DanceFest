import type {
  MyEntriesFilter,
  MyEntriesFilterController,
  MyEntriesFilterOption,
} from '../lib/myEntriesFilter.types';
import {
  ALL_FILTER_VALUE,
  DEFAULT_MY_ENTRIES_FILTER,
  MY_ENTRIES_SEARCH_MIN_CHARS,
} from '../lib/myEntriesFilter.constants';
import {
  ALL_MONTHS_LABEL,
  ALL_YEARS_LABEL,
  ENTRIES_SEARCH_LABEL,
  ENTRIES_SEARCH_MIN_CHARS_HINT,
  ENTRIES_SEARCH_PLACEHOLDER,
  MONTH_FILTER_LABEL,
  RESET_FILTERS_LABEL,
  YEAR_FILTER_LABEL,
} from './MyEntriesFilterBar.constants';
import styles from './MyEntriesFilterBar.module.css';

interface MyEntriesFilterBarProps {
  filter: MyEntriesFilter;
  years: MyEntriesFilterOption[];
  // The months of the chosen year (or of any year).
  months: MyEntriesFilterOption[];
  controller: MyEntriesFilterController;
}

// Search, year and month filters for «Мої заявки».
export default function MyEntriesFilterBar({
  filter,
  years,
  months,
  controller,
}: MyEntriesFilterBarProps) {
  const isDefault = (
    Object.keys(DEFAULT_MY_ENTRIES_FILTER) as (keyof MyEntriesFilter)[]
  ).every((key) => filter[key] === DEFAULT_MY_ENTRIES_FILTER[key]);
  const typed = filter.query.trim().length;
  const searchTooShort = typed > 0 && typed < MY_ENTRIES_SEARCH_MIN_CHARS;

  return (
    <div className={styles.bar}>
      <input
        className={styles.search}
        type="search"
        aria-label={ENTRIES_SEARCH_LABEL}
        placeholder={ENTRIES_SEARCH_PLACEHOLDER}
        value={filter.query}
        onChange={(e) => controller.change({ ...filter, query: e.target.value })}
      />
      {searchTooShort && (
        <p className={styles.hint}>{ENTRIES_SEARCH_MIN_CHARS_HINT}</p>
      )}
      <select
        className={styles.select}
        aria-label={YEAR_FILTER_LABEL}
        value={filter.year}
        onChange={(e) =>
          // Another year offers other months — the picked one may not exist.
          controller.change({
            ...filter,
            year: e.target.value,
            month: ALL_FILTER_VALUE,
          })
        }
      >
        <option value={ALL_FILTER_VALUE}>{ALL_YEARS_LABEL}</option>
        {years.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <select
        className={styles.select}
        aria-label={MONTH_FILTER_LABEL}
        value={filter.month}
        onChange={(e) => controller.change({ ...filter, month: e.target.value })}
      >
        <option value={ALL_FILTER_VALUE}>{ALL_MONTHS_LABEL}</option>
        {months.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className={styles.reset}
        disabled={isDefault}
        onClick={() => controller.change(DEFAULT_MY_ENTRIES_FILTER)}
      >
        {RESET_FILTERS_LABEL}
      </button>
    </div>
  );
}
