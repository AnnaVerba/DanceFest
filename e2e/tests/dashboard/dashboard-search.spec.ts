import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { SEEDED_COMPETITION } from '../../src/constants/test-data.constants';

/**
 * Exercises the dashboard's search box using the pre-existing seeded competition,
 * so it needs no competition of its own to be created (creation is blocked by
 * BUG-2 for a brand-new Organizer — see tests/known-bugs). Reaching the table at
 * all currently relies on BUG-3/BUG-4 (any authenticated role sees every
 * competition); this test is about the search behavior itself, not that gap.
 */
test.describe('Dashboard search', () => {
  test('filters the competitions table by name and reports no matches', async ({
    page,
    registerPage,
    dashboardPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);
    await dashboardPage.open();

    await dashboardPage.searchFor(SEEDED_COMPETITION.NAME);
    await expect(dashboardPage.competitionRow(SEEDED_COMPETITION.NAME)).toBeVisible();

    await dashboardPage.searchFor('no-such-competition-xyz-e2e');
    await expect(dashboardPage.noResultsMessage()).toBeVisible();
  });
});
