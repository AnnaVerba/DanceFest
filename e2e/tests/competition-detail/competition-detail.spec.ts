import { test, expect } from '../../src/fixtures/test.fixture';
import { OrganizerCompetitionFactory } from '../../src/utils/organizer-competition.factory';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { UI_TEXT } from '../../src/constants/ui-text.constants';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Competition detail (/competitions/:id) — as the owning Organizer', () => {
  test('Деталі tab shows Edit/Delete, and Номінації/Майданчики/Заявки all work', async ({
    page,
    request,
    registerPage,
    competitionDetailPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Detail Competition ${Date.now()}`,
    );

    await competitionDetailPage.open(competitionId);
    await expect(competitionDetailPage.editLink()).toBeVisible();
    await expect(competitionDetailPage.deleteButton()).toBeVisible();

    await competitionDetailPage.openTab(UI_TEXT.competitionDetail.TAB_NOMINATIONS);
    const nominationName = `E2E Solo ${Date.now()}`;
    await competitionDetailPage.addNomination(nominationName);
    await expect(competitionDetailPage.nominationRow(nominationName)).toBeVisible();

    await competitionDetailPage.openTab(UI_TEXT.competitionDetail.TAB_VENUES);
    const venueName = `E2E Stage ${Date.now()}`;
    await competitionDetailPage.addVenue(venueName);
    await expect(competitionDetailPage.venueRow(venueName)).toBeVisible();

    await competitionDetailPage.openTab(UI_TEXT.competitionDetail.TAB_ENTRIES);
    await expect(page.getByText('На цей конкурс ще не подано жодної заявки.')).toBeVisible();
    await expect(competitionDetailPage.applyFormLink()).toBeVisible();
  });

  test('deleting a competition redirects to the dashboard and it is no longer reachable', async ({
    page,
    request,
    registerPage,
    competitionDetailPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Delete Competition ${Date.now()}`,
    );

    await competitionDetailPage.open(competitionId);
    await competitionDetailPage.deleteButton().click();
    await competitionDetailPage.confirmDelete();

    await expect(page).toHaveURL(ROUTES.DASHBOARD);

    await competitionDetailPage.open(competitionId);
    await expect(competitionDetailPage.loadErrorMessage()).toBeVisible();
  });

  test('a nonexistent competition id shows a graceful load error', async ({
    registerPage,
    competitionDetailPage,
  }) => {
    await registerPage.open();
    await registerPage.registerAccount(TestAccountFactory.create('ORGANIZER'));

    await competitionDetailPage.open('00000000-0000-0000-0000-000000000000');

    await expect(competitionDetailPage.loadErrorMessage()).toBeVisible();
  });
});
