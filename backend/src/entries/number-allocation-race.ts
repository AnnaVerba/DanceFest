import { UniqueConstraintError } from 'sequelize';
import { NUMBER_ALLOCATION_UNIQUE_INDEXES } from './entries.constants';

// Postgres reports the violated index on the driver error; Sequelize keeps
// it as `.original`/`.parent` but leaves those fields untyped.
interface DriverUniqueViolation {
  constraint?: string;
}

// True only when a unique violation is a lost race for a running number
// (see NUMBER_ALLOCATION_UNIQUE_INDEXES) — the one case where re-running
// the insert transaction can succeed. Anything else (a person already
// numbered in this competition, an FK, a null) is final.
export function isNumberAllocationRace(err: unknown): boolean {
  if (!(err instanceof UniqueConstraintError)) {
    return false;
  }
  const violatedIndex = (err.original as DriverUniqueViolation | undefined)
    ?.constraint;
  return (
    violatedIndex !== undefined &&
    NUMBER_ALLOCATION_UNIQUE_INDEXES.includes(violatedIndex)
  );
}
