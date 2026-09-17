import {
  findBirthDateProblem,
  IsValidBirthDate,
} from './is-valid-birth-date.validator';
import { validate } from 'class-validator';
import {
  BIRTH_DATE_IN_FUTURE_MESSAGE,
  BIRTH_DATE_INVALID_MESSAGE,
  BIRTH_DATE_OUT_OF_RANGE_MESSAGE,
  MAX_AGE_YEARS,
} from './birth-date.constants';

function isoDaysFromToday(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe('findBirthDateProblem', () => {
  it('приймає звичайну дату народження', () => {
    expect(findBirthDateProblem('2010-05-20')).toBeNull();
  });

  it('приймає сьогоднішню дату (народжений сьогодні)', () => {
    expect(findBirthDateProblem(isoDaysFromToday(0))).toBeNull();
  });

  it.each([
    ['не рядок', 20100520],
    ['порожній рядок', ''],
    ['без нулів', '2010-5-2'],
    ['неіснуючий день', '2021-02-31'],
    ['сміття', 'вчора'],
  ])('позначає %s як проблему формату', (_label, value) => {
    expect(findBirthDateProblem(value)).toBe('format');
  });

  it('позначає майбутню дату', () => {
    expect(findBirthDateProblem(isoDaysFromToday(1))).toBe('future');
  });

  it('позначає рік до 1900', () => {
    expect(findBirthDateProblem('1889-01-01')).toBe('range');
  });

  it(`позначає вік понад ${MAX_AGE_YEARS} років`, () => {
    const tooOld = new Date();
    tooOld.setUTCFullYear(tooOld.getUTCFullYear() - MAX_AGE_YEARS - 1);
    expect(findBirthDateProblem(tooOld.toISOString().slice(0, 10))).toBe(
      'range',
    );
  });
});

class Holder {
  @IsValidBirthDate()
  birthDate: unknown;
}

async function messagesFor(value: unknown): Promise<string[]> {
  const holder = new Holder();
  holder.birthDate = value;
  const errors = await validate(holder);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('IsValidBirthDate decorator', () => {
  it('пропускає коректну дату', async () => {
    expect(await messagesFor('2000-01-01')).toEqual([]);
  });

  it('повертає повідомлення про формат', async () => {
    expect(await messagesFor('2021-02-31')).toContain(
      BIRTH_DATE_INVALID_MESSAGE,
    );
  });

  it('повертає повідомлення про майбутнє', async () => {
    expect(await messagesFor(isoDaysFromToday(2))).toContain(
      BIRTH_DATE_IN_FUTURE_MESSAGE,
    );
  });

  it('повертає повідомлення про діапазон', async () => {
    expect(await messagesFor('1500-01-01')).toContain(
      BIRTH_DATE_OUT_OF_RANGE_MESSAGE,
    );
  });
});
