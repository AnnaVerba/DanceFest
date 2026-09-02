import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { REGISTERABLE_ROLES, ROLE_CABINET_PATH } from '../../src/constants/roles.constants';

/**
 * Each self-registerable role has exactly one landing page after login:
 * PARTICIPANT and COACH each get a personal cabinet, ORGANIZER shares the
 * Organizer dashboard with ADMIN (not covered here — no self-registration).
 */
test.describe('Post-login redirect goes to the right cabinet', () => {
  for (const role of REGISTERABLE_ROLES) {
    test(`a ${role} account lands on ${ROLE_CABINET_PATH[role]} after logging in`, async ({
      page,
      registerPage,
      loginPage,
    }) => {
      const account = TestAccountFactory.create(role);
      await registerPage.open();
      await registerPage.registerAccount(account);
      await expect(page).toHaveURL('/');
      await page.evaluate(() => window.localStorage.clear());

      await loginPage.open();
      await loginPage.login(account.email, account.password, account.role);

      await expect(page).toHaveURL(ROLE_CABINET_PATH[role]);
    });
  }
});
