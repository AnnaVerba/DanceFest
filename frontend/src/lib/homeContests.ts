import type { Competition } from './competitions';

const DATE_LOCALE = 'uk-UA';

export const HOME_STATUS_FILTER_ID = {
  ALL: 'all',
  REGISTRATION_OPEN: 'open',
  UPCOMING: 'soon',
  FINISHED: 'finished',
} as const;

export type HomeStatusFilterId =
  (typeof HOME_STATUS_FILTER_ID)[keyof typeof HOME_STATUS_FILTER_ID];

// The id is sent to the server as the list's `status` filter (ALL sends none).
export interface HomeStatusFilter {
  id: HomeStatusFilterId;
  label: string;
}

export const HOME_STATUS_FILTERS: readonly HomeStatusFilter[] = [
  { id: HOME_STATUS_FILTER_ID.ALL, label: 'Усі конкурси' },
  { id: HOME_STATUS_FILTER_ID.REGISTRATION_OPEN, label: 'Реєстрація відкрита' },
  { id: HOME_STATUS_FILTER_ID.UPCOMING, label: 'Заплановані' },
  { id: HOME_STATUS_FILTER_ID.FINISHED, label: 'Завершені' },
];


export interface MonthGroup {
  key: string;
  label: string;
  countLabel: string;
  competitions: Competition[];
}

const CONTEST_NOUNS = ['конкурс', 'конкурси', 'конкурсів'] as const;

export function pluralContests(count: number): string {
  const d10 = count % 10;
  const d100 = count % 100;
  if (d10 === 1 && d100 !== 11) return CONTEST_NOUNS[0];
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return CONTEST_NOUNS[1];
  return CONTEST_NOUNS[2];
}

export function formatContestDate(iso: string): string {
  return new Date(iso).toLocaleDateString(DATE_LOCALE, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

const DAY_MONTH_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
};
const DAY_RANGE_DASH = '–';
const DATE_RANGE_DASH = ' – ';

function dayMonthOf(date: Date): string {
  return date.toLocaleDateString(DATE_LOCALE, DAY_MONTH_OPTIONS);
}

// Compact card date — «5 вересня 2026», «10–12 вересня 2026»,
// «30 вересня – 2 жовтня 2026»; the year repeats only across years.
export function formatContestDateRange(dateFrom: string, dateTo: string): string {
  const from = new Date(dateFrom);
  const to = new Date(dateTo);
  if (dateFrom === dateTo) {
    return `${dayMonthOf(from)} ${from.getFullYear()}`;
  }
  if (from.getFullYear() !== to.getFullYear()) {
    return `${dayMonthOf(from)} ${from.getFullYear()}${DATE_RANGE_DASH}${dayMonthOf(to)} ${to.getFullYear()}`;
  }
  if (from.getMonth() === to.getMonth()) {
    return `${from.getDate()}${DAY_RANGE_DASH}${dayMonthOf(to)} ${to.getFullYear()}`;
  }
  return `${dayMonthOf(from)}${DATE_RANGE_DASH}${dayMonthOf(to)} ${to.getFullYear()}`;
}

export function groupContestsByMonth(competitions: Competition[]): MonthGroup[] {
  const buckets = new Map<string, Competition[]>();
  for (const c of competitions) {
    const d = new Date(c.dateFrom);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(c);
    else buckets.set(key, [c]);
  }

  // Calendar rotated to "now": the current month first, then the coming
  // months in order, then past months most-recent-first (people still
  // browse finished contests). Month grouping is kept.
  const now = new Date();
  const currentKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const isPast = (key: string) => key < currentKey;

  return [...buckets.entries()]
    .sort(([a], [b]) => {
      if (isPast(a) !== isPast(b)) return isPast(a) ? 1 : -1;
      return isPast(a) ? b.localeCompare(a) : a.localeCompare(b);
    })
    .map(([key, items]) => {
      const competitions = [...items].sort(
        (a, b) => new Date(a.dateFrom).getTime() - new Date(b.dateFrom).getTime(),
      );
      const first = new Date(competitions[0].dateFrom);
      const monthName = first.toLocaleDateString(DATE_LOCALE, { month: 'long' });
      return {
        key,
        label: `${monthName} ${first.getFullYear()}`.toUpperCase(),
        countLabel: `${items.length} ${pluralContests(items.length)}`,
        competitions,
      };
    });
}
