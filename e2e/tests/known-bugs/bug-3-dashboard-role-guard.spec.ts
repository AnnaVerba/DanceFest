import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';

/**
 * BUG-3 (qa-test.md, re-confirmed live 2026-09-02): DashboardPage only checks
 * `getToken()` ("is anyone logged in"), never the role — so a freshly registered
 * PARTICIPANT or COACH, with zero organizer privileges, gets the full Organizer
 * dashboard instead of being redirected away.
 *
 * Expected/correct behavior once fixed: a non-Organizer, non-Admin account should
 * NOT see the Organizer dashboard UI at /dashboard.
 *
 * `test.fail()` marks these as known-failing: they go green (reported as an
 * "unexpected pass") the moment the role guard is fixed, which is the signal to
 * flip these back to plain assertions.
 */
test.describe('BUG-3 — /dashboard is not role-gated', () => {
  test.fail();

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
