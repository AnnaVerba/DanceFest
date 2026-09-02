import { E2E_TEST_PASSWORD } from '../constants/test-data.constants';
import type { Role } from '../types/role.type';
import type { TestAccount } from '../types/test-account.interface';

/**
 * Builds fresh, collision-free test accounts so repeated suite runs never hit
 * "email or phone already registered" — the backend enforces uniqueness on both.
 */
export class TestAccountFactory {
  private static sequence = 0;

  private static uniqueDigits(): string {
    TestAccountFactory.sequence += 1;
    // Date.now() alone can repeat within the same millisecond across two calls;
    // the sequence counter guarantees uniqueness even then.
    return `${Date.now()}${TestAccountFactory.sequence}`;
  }

  static create(role: Role): TestAccount {
    const digits = TestAccountFactory.uniqueDigits();
    // "50" is a real Ukrainian mobile prefix (matches the value the app's own
    // placeholder shows); only the trailing 7 digits need to be unique per account.
    const phoneSubscriberNumber = `50${digits.slice(-7).padStart(7, '0')}`;

    return {
      role,
      email: `e2e.${role.toLowerCase()}.${digits}@example.com`,
      password: E2E_TEST_PASSWORD,
      firstName: 'E2E',
      lastName: `Test${digits}`,
      phone: `+380${phoneSubscriberNumber}`,
    };
  }
}
