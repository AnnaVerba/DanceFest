import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';

/**
 * BUG-3 (qa-test.md, re-confirmed live 2026-09-02): DashboardPage only checked
 * `getToken()` ("is anyone logged in"), never the role — so a freshly registered
 * PARTICIPANT or COACH, with zero organizer privileges, got the full Organizer
 * dashboard instead of being redirected away.
 *
 * Fixed 2026-09-02: DashboardPage now redirects PARTICIPANT to /profile and
 * COACH to /coach (their own cabinet, see tests/cabinets). Kept here, flipped
 * from `test.fail()` to a plain assertion, as a regression test.
 */
test.describe('BUG-3 — /dashboard is not role-gated', () => {
  test('a PARTICIPANT account cannot reach the Organizer dashboard', async ({
    page,
    registerPage,
    dashboardPage,
  }) => {
    const account = TestAccountFactory.create('PARTICIPANT');
    await registerPage.open();
    await registerPage.registerAccount(account);
    await expect(page).toHaveURL('/');

    await dashboardPage.open();

    await expect(dashboardPage.heading()).not.toBeVisible();
  });

  test('a COACH account cannot reach the Organizer dashboard', async ({
    page,
    registerPage,
    dashboardPage,
  }) => {
    const account = TestAccountFactory.create('COACH');
    await registerPage.open();
    await registerPage.registerAccount(account);
    await expect(page).toHaveURL('/');

    await dashboardPage.open();

    await expect(dashboardPage.heading()).not.toBeVisible();
  });
});
