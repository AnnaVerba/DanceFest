import { describe, it, expect } from 'vitest';
import {
  isValidBirthDate,
  isValidEmail,
  isValidName,
  isValidPhone,
} from './validation';
import { MAX_AGE_YEARS } from './validation.constants';

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('isValidEmail', () => {
  it('приймає звичайний email', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
  });

  it.each(['user', 'user@', '@example.com', 'a b@example.com', ''])(
    'відхиляє «%s»',
    (value) => {
      expect(isValidEmail(value)).toBe(false);
    },
  );
});

describe('isValidPhone', () => {
  it('приймає номер у форматі E.164', () => {
    expect(isValidPhone('+380501234567')).toBe(true);
  });

  it.each(['', '0501234567', '+38050', 'телефон'])(
    'відхиляє «%s»',
    (value) => {
      expect(isValidPhone(value)).toBe(false);
    },
  );
});

describe('isValidName', () => {
  it('приймає імʼя з двох і більше символів', () => {
    expect(isValidName('Ян')).toBe(true);
  });

  it('відхиляє порожнє або надто коротке', () => {
    expect(isValidName(' ')).toBe(false);
    expect(isValidName('Я')).toBe(false);
  });
});

describe('isValidBirthDate', () => {
  it('приймає звичайну дату', () => {
    expect(isValidBirthDate('2010-05-20')).toBe(true);
  });

  it('приймає сьогоднішню дату', () => {
    expect(isValidBirthDate(isoDaysFromToday(0))).toBe(true);
  });

  it.each([
    ['порожній рядок', ''],
    ['без нулів', '2010-5-2'],
    ['неіснуючий день', '2021-02-31'],
    ['сміття', 'вчора'],
  ])('відхиляє %s', (_label, value) => {
    expect(isValidBirthDate(value)).toBe(false);
  });

  it('відхиляє майбутню дату', () => {
    expect(isValidBirthDate(isoDaysFromToday(1))).toBe(false);
  });

  it('відхиляє рік до 1900', () => {
    expect(isValidBirthDate('1899-12-31')).toBe(false);
  });

  it(`відхиляє вік понад ${MAX_AGE_YEARS} років`, () => {
    const tooOld = new Date();
    tooOld.setUTCFullYear(tooOld.getUTCFullYear() - MAX_AGE_YEARS - 1);
    expect(isValidBirthDate(tooOld.toISOString().slice(0, 10))).toBe(false);
  });
});
