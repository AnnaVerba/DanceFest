import { plainToInstance } from 'class-transformer';
import { NormalizeEmail } from './normalize-email.transform';

class Holder {
  @NormalizeEmail()
  email?: unknown;
}

describe('NormalizeEmail', () => {
  it('обрізає пробіли й переводить у нижній регістр', () => {
    const holder = plainToInstance(Holder, { email: '  User@Example.COM ' });
    expect(holder.email).toBe('user@example.com');
  });

  it('не чіпає нерядкові значення', () => {
    expect(plainToInstance(Holder, { email: undefined }).email).toBeUndefined();
    expect(plainToInstance(Holder, { email: 42 }).email).toBe(42);
  });
});
