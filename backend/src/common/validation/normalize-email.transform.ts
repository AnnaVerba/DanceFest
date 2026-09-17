import { Transform } from 'class-transformer';

// Fold email to a canonical form (trimmed, lower-cased) before it is
// validated or stored. Lookups are case-sensitive, so without this
// "A@x.com" and "a@x.com" become two accounts.
export function NormalizeEmail() {
  return Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
}
