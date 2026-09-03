import { test, expect } from '../../src/fixtures/test.fixture';
import { OrganizerCompetitionFactory } from '../../src/utils/organizer-competition.factory';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { UI_TEXT } from '../../src/constants/ui-text.constants';

/**
 * BUG-6 (found live 2026-09-03, same shape as the historical BUG-2 in
 * specs/e2e-test-plan.md, now re-confirmed against the current backend):
 * `VenuesService.list` / `EntriesService.list` correctly reject a non-owner,
 * non-team-member with 403 (`loadCompetitionAndAssertAccess`), but
 * `VenuesPanel.tsx` / `EntriesPanel.tsx` leave their `venues`/`entries` state
 * as `null` on any load error, and only the "empty array" case renders a
 * message — so a 403 currently renders as a completely blank panel with no
 * error text, indistinguishable from "this tab has no content yet" for a
 * screen reader or a user without access to the toast that briefly appears.
 *
 * `test.fail()` marks this as known-failing until the panels render an
 * explicit "you don't have access" state for a load error.
 */
test.describe('BUG-6 — Майданчики/Заявки tabs render a blank panel (not an error) for a non-owner', () => {
  test.fail();

  test('a second Organizer sees an explicit error, not a blank panel, on Майданчики', async ({
    page,
    request,
    registerPage,
    competitionDetailPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E BUG-6 Competition ${Date.now()}`,
    );
    await page.evaluate(() => window.localStorage.clear());

    await registerPage.open();
    await registerPage.registerAccount(TestAccountFactory.create('ORGANIZER'));

    await competitionDetailPage.open(competitionId);
    await competitionDetailPage.openTab(UI_TEXT.competitionDetail.TAB_VENUES);

    await expect(page.getByText(/немає доступу|доступ заборонено/i)).toBeVisible();
  });
});
