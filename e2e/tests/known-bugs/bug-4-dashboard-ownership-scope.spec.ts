import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { SEEDED_COMPETITION } from '../../src/constants/test-data.constants';

/**
 * BUG-4 (qa-test.md, re-confirmed live 2026-09-02): DashboardPage renders every
 * competition GET /competitions returns, with no ownership filter — a brand-new
 * Organizer with 0 competitions of their own still sees the seeded "BE-9 Smoke Test"
 * competition (owned by the seeded admin "Test") in their table, counted in the
 * stat cards.
 *
 * Expected/correct behavior once fixed: a fresh Organizer's dashboard should list
 * only competitions they own, so `stats.total` should be 0, not 1.
 *
 * `test.fail()` marks this as known-failing until the ownership filter lands.
 */
test.describe('BUG-4 — dashboard competition list is not scoped to the owner', () => {
  test.fail();

  test('a brand-new Organizer does not see another organizer\'s competition', async ({
    page,
    registerPage,
    dashboardPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);
    await expect(page).toHaveURL('/');

    await dashboardPage.open();

    await expect(dashboardPage.competitionRow(SEEDED_COMPETITION.NAME)).not.toBeVisible();
    await expect(page.getByText('Всього: 0')).toBeVisible();
  });
});
