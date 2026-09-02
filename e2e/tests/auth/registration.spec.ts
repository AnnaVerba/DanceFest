import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { REGISTERABLE_ROLES } from '../../src/constants/roles.constants';

test.describe('Registration', () => {
  for (const role of REGISTERABLE_ROLES) {
    test(`registers a new ${role} account and logs it in automatically`, async ({
      page,
      registerPage,
    }) => {
      const account = TestAccountFactory.create(role);
      await registerPage.open();
      await registerPage.registerAccount(account);

      await expect(page).toHaveURL('/');
    });
  }

  test('rejects mismatched passwords before sending any request', async ({
    page,
    registerPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.selectRole(account.role);
    await page.getByLabel("Ім'я").fill(account.firstName);
    await page.getByLabel('Прізвище').fill(account.lastName);
    await page.getByLabel('Телефон').fill(account.phone);
    await page.getByLabel('Email').fill(account.email);
    await page.getByLabel('Пароль', { exact: true }).fill(account.password);
    await page.getByLabel('Повторіть пароль').fill(`not-${account.password}`);
    await registerPage.submit();

    await expect(registerPage.passwordMismatchError()).toBeVisible();
    await expect(page).toHaveURL('/register');
  });
});
