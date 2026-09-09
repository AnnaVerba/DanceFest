import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';
import { AccessLevel } from '../access-level.enum';
import { PHONE_INVALID_MESSAGE } from '../../common/validation/phone.constants';
import { BIRTH_DATE_IN_FUTURE_MESSAGE } from '../../common/validation/birth-date.constants';

const VALID: Record<string, unknown> = {
  firstName: 'Іван',
  lastName: 'Іванов',
  phone: '+380501234567',
  email: 'user@example.com',
  password: 'strongPassword123',
  birthDate: '2010-05-20',
  role: AccessLevel.PARTICIPANT,
};

async function messagesFor(patch: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(RegisterDto, { ...VALID, ...patch });
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('RegisterDto', () => {
  it('приймає коректне тіло запиту', async () => {
    expect(await messagesFor({})).toEqual([]);
  });

  it('нормалізує email перед валідацією', async () => {
    const dto = plainToInstance(RegisterDto, {
      ...VALID,
      email: '  User@Example.COM ',
    });
    expect(dto.email).toBe('user@example.com');
    expect(await validate(dto)).toEqual([]);
  });

  it('відхиляє телефон не у форматі E.164', async () => {
    expect(await messagesFor({ phone: '0501234567' })).toContain(
      PHONE_INVALID_MESSAGE,
    );
  });

  it('відхиляє дату народження в майбутньому', async () => {
    const future = new Date();
    future.setUTCFullYear(future.getUTCFullYear() + 1);
    expect(
      await messagesFor({ birthDate: future.toISOString().slice(0, 10) }),
    ).toContain(BIRTH_DATE_IN_FUTURE_MESSAGE);
  });

  it('відхиляє нереальний рік народження', async () => {
    const messages = await messagesFor({ birthDate: '1200-01-01' });
    expect(messages.length).toBeGreaterThan(0);
  });
});
