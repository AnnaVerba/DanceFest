/**
 * Тривалість у положеннях пишуть і як «2:30», і як «150». Форма приймає обидва
 * записи, а показує завжди перший.
 */
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

const NOUNS = ['вихід', 'виходи', 'виходів'];

export function pluralExits(count: number): string {
  const d10 = count % 10;
  const d100 = count % 100;
  if (d10 === 1 && d100 !== 11) return NOUNS[0];
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return NOUNS[1];
  return NOUNS[2];
}
