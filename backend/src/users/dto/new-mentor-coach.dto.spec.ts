import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { NewMentorCoachDto } from './new-mentor-coach.dto';
import { PHONE_INVALID_MESSAGE } from '../../common/validation/phone.constants';

const VALID: Record<string, unknown> = {
  firstName: 'Петро',
  lastName: 'Іваненко',
  phone: '+380671112233',
};

async function messagesFor(patch: Record<string, unknown>): Promise<string[]> {
  const dto = plainToInstance(NewMentorCoachDto, { ...VALID, ...patch });
  const errors = await validate(dto);
  return errors.flatMap((error) => Object.values(error.constraints ?? {}));
}

describe('NewMentorCoachDto', () => {
  it('приймає коректні дані нового тренера', async () => {
    expect(await messagesFor({})).toEqual([]);
  });

  it('відхиляє телефон не у форматі E.164', async () => {
    expect(await messagesFor({ phone: 'тренер' })).toContain(
      PHONE_INVALID_MESSAGE,
    );
  });

  it('вимагає імʼя та прізвище', async () => {
    expect(await messagesFor({ firstName: '', lastName: '' })).not.toEqual([]);
  });
});
