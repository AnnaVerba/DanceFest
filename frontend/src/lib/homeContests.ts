import { getCompetitionStatus } from './competitions';
import type { Competition } from './competitions';
import { COMPETITION_STATUS } from './competitionStatus';
import type { CompetitionStatus } from './competitionStatus';

const DATE_LOCALE = 'uk-UA';

export const HOME_STATUS_FILTER_ID = {
  ALL: 'all',
  REGISTRATION_OPEN: 'open',
  UPCOMING: 'soon',
} as const;

export type HomeStatusFilterId =
  (typeof HOME_STATUS_FILTER_ID)[keyof typeof HOME_STATUS_FILTER_ID];

export interface HomeStatusFilter {
  id: HomeStatusFilterId;
  label: string;
  statuses: readonly CompetitionStatus[];
}

export const HOME_STATUS_FILTERS: readonly HomeStatusFilter[] = [
  { id: HOME_STATUS_FILTER_ID.ALL, label: 'Усі', statuses: [] },
  {
    id: HOME_STATUS_FILTER_ID.REGISTRATION_OPEN,
    label: 'Відкрита реєстрація',
    statuses: [COMPETITION_STATUS.REGISTRATION_OPEN],
  },
  {
    id: HOME_STATUS_FILTER_ID.UPCOMING,
    label: 'Незабаром',
    statuses: [COMPETITION_STATUS.PLANNED],
  },
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

export function formatContestDateRange(dateFrom: string, dateTo: string): string {
  return dateFrom === dateTo
    ? formatContestDate(dateFrom)
    : `${formatContestDate(dateFrom)} – ${formatContestDate(dateTo)}`;
}

// Name / year filtering and paging now happen on the server; only the
// status filter is applied to the loaded page here.
export function filterHomeContests(
  competitions: Competition[],
  statusId: HomeStatusFilterId,
): Competition[] {
  const active = HOME_STATUS_FILTERS.find((f) => f.id === statusId);
  if (!active || active.statuses.length === 0) return competitions;
  return competitions.filter((c) =>
    active.statuses.includes(getCompetitionStatus(c)),
  );
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
