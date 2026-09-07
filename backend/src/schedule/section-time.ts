import { SECONDS_PER_HOUR, SECONDS_PER_MINUTE } from './schedule.constants';

const HH_MM = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

// "09:30" -> 34200. Returns null for anything that is not a 24h HH:MM.
export function parseHhMm(raw: string): number | null {
  const match = HH_MM.exec(raw.trim());
  if (!match) return null;
  return (
    Number(match[1]) * SECONDS_PER_HOUR + Number(match[2]) * SECONDS_PER_MINUTE
  );
}

// 34205 -> "09:30:05". Used for every time the API hands back, so the
// client never does clock arithmetic.
export function formatHhMmSs(totalSeconds: number): string {
  const seconds = Math.max(0, Math.round(totalSeconds));
  const hh = Math.floor(seconds / SECONDS_PER_HOUR);
  const mm = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
  const ss = seconds % SECONDS_PER_MINUTE;
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':');
}
