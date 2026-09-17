import { Transform } from 'class-transformer';

// Strip surrounding whitespace from a phone before it is validated or
// stored, so " +380501234567 " persists as the canonical E.164 value and
// phone lookups keep matching.
export function NormalizePhone() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );
}
