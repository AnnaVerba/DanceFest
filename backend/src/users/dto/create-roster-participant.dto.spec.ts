import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateRosterParticipantDto } from './create-roster-participant.dto';
import { PHONE_INVALID_MESSAGE } from '../../common/validation/phone.constants';

const VALID: Record<string, unknown> = {
  firstName: 'Іван',
  lastName: 'Іванов',
  phone: '+380501234567',
  birthDate: '2012-03-10',
};

async function messagesFor(patch: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(CreateRosterParticipantDto, {
    ...VALID,
    ...patch,
  });
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('CreateRosterParticipantDto', () => {
  it('приймає мінімальне коректне тіло (без email і пароля)', async () => {
    expect(await messagesFor({})).toEqual([]);
  });

  it('відхиляє телефон не у форматі E.164', async () => {
    expect(await messagesFor({ phone: '050-123-45-67' })).toContain(
      PHONE_INVALID_MESSAGE,
    );
  });

  it('відхиляє майбутню дату народження', async () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 5);
    expect(
      await messagesFor({ birthDate: future.toISOString().slice(0, 10) }),
    ).not.toEqual([]);
  });

  it('нормалізує email, коли він переданий', async () => {
    const dto = plainToInstance(CreateRosterParticipantDto, {
      ...VALID,
      email: 'ROSTER@Example.com',
    });
    expect(dto.email).toBe('roster@example.com');
    expect(await validate(dto)).toEqual([]);
  });
});
