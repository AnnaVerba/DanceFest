const MISSING_BIRTH_DATE = '—';

// "2010-05-20" → "20.05.2010" for the roster lists.
export function formatBirthDate(iso: string | null): string {
  if (!iso) return MISSING_BIRTH_DATE;
  const [y, m, d] = iso.split('-');
  return d && m && y ? `${d}.${m}.${y}` : iso;
}
