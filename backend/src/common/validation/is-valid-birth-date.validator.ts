import { registerDecorator } from 'class-validator';
import type { ValidationArguments, ValidationOptions } from 'class-validator';
import {
  BIRTH_DATE_IN_FUTURE_MESSAGE,
  BIRTH_DATE_INVALID_MESSAGE,
  BIRTH_DATE_OUT_OF_RANGE_MESSAGE,
  MAX_AGE_YEARS,
  MIN_BIRTH_YEAR,
} from './birth-date.constants';

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export type BirthDateProblem = 'format' | 'future' | 'range';

// Returns which rule a value breaks, or null when it is a usable birth
// date. Exported so it can be unit-tested and reused without the
// decorator machinery.
export function findBirthDateProblem(value: unknown): BirthDateProblem | null {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value.trim())) {
    return 'format';
  }
  const trimmed = value.trim();
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return 'format';
  }
  // Reject rolled-over dates such as 2021-02-31 -> 2021-03-03.
  if (parsed.toISOString().slice(0, 10) !== trimmed) {
    return 'format';
  }

  const now = new Date();
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (parsed.getTime() > todayUtc) {
    return 'future';
  }

  const oldestAllowed = Date.UTC(
    now.getUTCFullYear() - MAX_AGE_YEARS,
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  if (
    parsed.getUTCFullYear() < MIN_BIRTH_YEAR ||
    parsed.getTime() < oldestAllowed
  ) {
    return 'range';
  }

  return null;
}

const MESSAGE_BY_PROBLEM: Record<BirthDateProblem, string> = {
  format: BIRTH_DATE_INVALID_MESSAGE,
  future: BIRTH_DATE_IN_FUTURE_MESSAGE,
  range: BIRTH_DATE_OUT_OF_RANGE_MESSAGE,
};

// A real calendar date, not in the future, within a human age range.
// Reused by register and roster-dancer DTOs.
export function IsValidBirthDate(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidBirthDate',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return findBirthDateProblem(value) === null;
        },
        defaultMessage(args: ValidationArguments) {
          const problem = findBirthDateProblem(args.value);
          return problem
            ? MESSAGE_BY_PROBLEM[problem]
            : BIRTH_DATE_INVALID_MESSAGE;
        },
      },
    });
  };
}
