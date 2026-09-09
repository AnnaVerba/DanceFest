import { validate } from 'class-validator';
import { IsE164Phone } from './is-e164-phone.validator';
import { PHONE_INVALID_MESSAGE } from './phone.constants';

class Holder {
  @IsE164Phone()
  phone: unknown;
}

async function check(value: unknown): Promise<string[]> {
  const holder = new Holder();
  holder.phone = value;
  const errors = await validate(holder);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('IsE164Phone', () => {
  it('приймає номер у форматі E.164', async () => {
    expect(await check('+380501234567')).toEqual([]);
  });

  it('обрізає пробіли перед перевіркою', async () => {
    expect(await check('  +380501234567  ')).toEqual([]);
  });

  it.each([
    ['без плюса', '380501234567'],
    ['з нулем першою цифрою', '+0501234567'],
    ['занадто короткий', '+38050'],
    ['з літерами', '+38050ABC4567'],
    ['порожній рядок', ''],
    ['не рядок', 12345],
    ['undefined', undefined],
  ])('відхиляє %s', async (_label, value) => {
    expect(await check(value)).toContain(PHONE_INVALID_MESSAGE);
  });
});
