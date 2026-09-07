export function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
}

export function parseDuration(raw: string): number | null {
  const value = raw.trim();
  if (value === '') return null;

  if (value.includes(':')) {
    const [minutes, seconds] = value.split(':');
    const m = Number(minutes);
    const s = Number(seconds);
    if (!Number.isInteger(m) || !Number.isInteger(s) || m < 0 || s < 0 || s > 59) {
      return null;
    }
    return m * 60 + s;
  }

  const seconds = Number(value);
  if (!Number.isInteger(seconds) || seconds <= 0) return null;
  return seconds;
}

// "09:30:05" or "09:30" (24h) -> the same string trimmed to the wanted
// precision. The backend already hands times back as "HH:MM:SS", so this
// only decides how many parts to show.
export function formatClock(time: string, withSeconds = false): string {
  const parts = time.split(':');
  return withSeconds ? parts.slice(0, 3).join(':') : parts.slice(0, 2).join(':');
}

const HH_MM = /^([0-1]\d|2[0-3]):([0-5]\d)$/;

// "09:30" -> "09:30" once validated, else null. Section start times are the
// only clock value the organizer types.
export function parseClock(raw: string): string | null {
  return HH_MM.test(raw.trim()) ? raw.trim() : null;
}

const NOUNS = ['вихід', 'виходи', 'виходів'];

export function pluralExits(count: number): string {
  const d10 = count % 10;
  const d100 = count % 100;
  if (d10 === 1 && d100 !== 11) return NOUNS[0];
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return NOUNS[1];
  return NOUNS[2];
}
