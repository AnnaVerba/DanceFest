import { test, expect } from '../../src/fixtures/test.fixture';
import { OrganizerCompetitionFactory } from '../../src/utils/organizer-competition.factory';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Competition edit (/competitions/:id/edit)', () => {
  test('the owner edits the name and it is reflected on the detail page', async ({
    page,
    request,
    registerPage,
    competitionEditPage,
    competitionDetailPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Edit Competition ${Date.now()}`,
    );
    const updatedName = `E2E Edited Competition ${Date.now()}`;

    await competitionEditPage.open(competitionId);
    await expect(competitionEditPage.heading()).toBeVisible();
    await competitionEditPage.nameInput().fill(updatedName);
    await competitionEditPage.submit();

    await expect(page).toHaveURL(ROUTES.competitionDetail(competitionId));
    await expect(competitionDetailPage.heading(updatedName)).toBeVisible();
  });

  /**
   * `CompetitionsService.assertCanEdit` deliberately lets any ORGANIZER edit
   * any competition, not just their own (see the comment on that method in
   * `backend/src/competitions/competitions.service.ts`) — ownership only
   * gates the "Редагувати" link's visibility on the detail page, not the
   * PATCH itself. Documenting this as intended behavior, not a bug.
   */
  test('a second, unrelated Organizer can still save an edit by navigating to the URL directly', async ({
    page,
    request,
    registerPage,
    competitionEditPage,
    competitionDetailPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Edit Competition ${Date.now()}`,
    );
    await page.evaluate(() => window.localStorage.clear());

    await registerPage.open();
    await registerPage.registerAccount(TestAccountFactory.create('ORGANIZER'));
    // The detail page hides "Редагувати" for a non-owner...
    await competitionDetailPage.open(competitionId);
    await expect(competitionDetailPage.editLink()).not.toBeVisible();

    // ...but the edit page itself has no ownership check, and the backend accepts the PATCH.
    const updatedName = `E2E Edited By Non-Owner ${Date.now()}`;
    await competitionEditPage.open(competitionId);
    await competitionEditPage.nameInput().fill(updatedName);
    await competitionEditPage.submit();

    await expect(page).toHaveURL(ROUTES.competitionDetail(competitionId));
    await expect(competitionDetailPage.heading(updatedName)).toBeVisible();
  });

  test('a logged-out visitor is redirected to /login', async ({ page }) => {
    await page.goto(ROUTES.competitionEdit('00000000-0000-0000-0000-000000000000'));

    await expect(page).toHaveURL(ROUTES.LOGIN);
  });
});
