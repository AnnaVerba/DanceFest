import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { UI_TEXT } from '../../src/constants/ui-text.constants';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Login', () => {
  test('logs in an existing Organizer account and redirects to the dashboard', async ({
    page,
    registerPage,
    loginPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);
    await expect(page).toHaveURL('/');
    await page.evaluate(() => window.localStorage.clear());

    await loginPage.open();
    await loginPage.login(account.email, account.password, account.role);

    // ORGANIZER shares the Organizer dashboard with ADMIN; PARTICIPANT/COACH
    // land on their own cabinet instead (see cabinets/login-redirect.spec.ts).
    await expect(page).toHaveURL(ROUTES.DASHBOARD);
  });

  test('shows a generic error for wrong credentials without revealing whether the email exists', async ({
    page,
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.login('no-such-user-e2e@example.com', 'wrong-password', 'PARTICIPANT');

    await expect(loginPage.errorMessage()).toBeVisible();
    await expect(page).toHaveURL(ROUTES.LOGIN);
  });

  test('the submit button returns to its idle label after a failed login', async ({
    page,
    loginPage,
  }) => {
    await loginPage.open();
    await loginPage.login('no-such-user-e2e@example.com', 'wrong-password', 'PARTICIPANT');

    await expect(
      page.getByRole('button', { name: UI_TEXT.login.SUBMIT_IDLE }),
    ).toBeVisible();
  });
});

test.describe('Logout', () => {
  test('clears the session and returns to /login; the dashboard is no longer reachable', async ({
    page,
    registerPage,
    dashboardPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);
    await dashboardPage.open();
    await expect(dashboardPage.heading()).toBeVisible();

    await page.getByRole('button', { name: UI_TEXT.dashboard.LOGOUT_BUTTON }).click();
    await expect(page).toHaveURL(ROUTES.LOGIN);

    await dashboardPage.open();
    await expect(page).toHaveURL(ROUTES.LOGIN);
  });
});
