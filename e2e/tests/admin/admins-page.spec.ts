import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { SEEDED_ADMIN_ACCOUNT } from '../../src/constants/test-data.constants';
import { ROUTES } from '../../src/constants/routes.constants';
import { ROLE_CABINET_PATH } from '../../src/constants/roles.constants';

/**
 * /admins is the only way to create a new ADMIN account — there is no
 * self-registration path (see e2e/README.md). Requires the seeded ADMIN
 * (`backend/seeders/20260822090000-mock-admin.ts`, run once via `npm run seed`
 * inside the backend container).
 */
test.describe('Admins page (/admins)', () => {
  test('an Admin creates a new admin account', async ({ page, loginPage, adminsPage }) => {
    await loginPage.open();
    await loginPage.login(SEEDED_ADMIN_ACCOUNT.EMAIL, SEEDED_ADMIN_ACCOUNT.PASSWORD, 'ADMIN');
    await expect(page).toHaveURL(ROUTES.DASHBOARD);

    await adminsPage.open();
    await expect(adminsPage.heading()).toBeVisible();

    const digits = `${Date.now()}`;
    const newAdminEmail = `e2e.admin.${digits}@example.com`;
    await adminsPage.createAdmin({
      name: `E2E Admin ${digits}`,
      email: newAdminEmail,
      password: 'AdminPass123!',
    });

    await expect(adminsPage.successMessage(newAdminEmail)).toBeVisible();
  });

  test('rejects a password shorter than the minimum length client-side', async ({
    page,
    loginPage,
    adminsPage,
  }) => {
    await loginPage.open();
    await loginPage.login(SEEDED_ADMIN_ACCOUNT.EMAIL, SEEDED_ADMIN_ACCOUNT.PASSWORD, 'ADMIN');
    await expect(page).toHaveURL(ROUTES.DASHBOARD);

    await adminsPage.open();
    await adminsPage.createAdmin({
      name: 'Too Short',
      email: `e2e.admin.${Date.now()}@example.com`,
      password: 'abc',
    });

    await expect(adminsPage.errorMessage()).toBeVisible();
  });

  test('a non-admin account is redirected away to its own cabinet', async ({
    page,
    registerPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await page.goto(ROUTES.ADMINS);

    await expect(page).toHaveURL(ROLE_CABINET_PATH.ORGANIZER);
  });

  test('a logged-out visitor is redirected to /login', async ({ page }) => {
    await page.goto(ROUTES.ADMINS);

    await expect(page).toHaveURL(ROUTES.LOGIN);
  });
});
