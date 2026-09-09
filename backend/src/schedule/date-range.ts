const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Every 'YYYY-MM-DD' from `from` to `to`, both ends included. Used to keep
// one competition_days row per calendar day of the competition.
export function eachDateInclusive(from: string, to: string): string[] {
  const start = Date.parse(`${from}T00:00:00Z`);
  const end = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
    return [from];
  }
  const dates: string[] = [];
  for (let ms = start; ms <= end; ms += MS_PER_DAY) {
    dates.push(new Date(ms).toISOString().slice(0, 10));
  }
  return dates;
}
