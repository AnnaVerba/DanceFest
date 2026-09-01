import { registerDecorator } from 'class-validator';
import type { ValidationOptions } from 'class-validator';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function IsProgramLimits(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isProgramLimits',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          if (
            typeof value !== 'object' ||
            value === null ||
            Array.isArray(value)
          )
            return false;
          return Object.entries(value as Record<string, unknown>).every(
            ([key, seconds]) =>
              UUID_RE.test(key) &&
              typeof seconds === 'number' &&
              Number.isInteger(seconds) &&
              seconds > 0,
          );
        },
        defaultMessage() {
          return 'programLimits must map category ids to a positive whole number of seconds';
        },
      },
    });
  };
}
