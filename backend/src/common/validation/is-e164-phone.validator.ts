import { registerDecorator } from 'class-validator';
import type { ValidationOptions } from 'class-validator';
import { E164_REGEX, PHONE_INVALID_MESSAGE } from './phone.constants';

// A phone number in E.164 form ("+" plus 7-15 digits). Reused by every
// DTO that takes a phone: register, roster dancer, new mentor coach.
export function IsE164Phone(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isE164Phone',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && E164_REGEX.test(value.trim());
        },
        defaultMessage() {
          return PHONE_INVALID_MESSAGE;
        },
      },
    });
  };
}
