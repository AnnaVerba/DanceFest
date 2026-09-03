import { test, expect } from '../../src/fixtures/test.fixture';
import { OrganizerCompetitionFactory } from '../../src/utils/organizer-competition.factory';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Team page (/competitions/:id/team)', () => {
  test('the owner sees the "only manager" empty state and can open the invite modal', async ({
    request,
    registerPage,
    teamPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Team Competition ${Date.now()}`,
    );

    await teamPage.open(competitionId);
    await expect(teamPage.heading()).toBeVisible();
    await expect(teamPage.onlyManagerMessage()).toBeVisible();

    await teamPage.openAddAdminModal();
    await teamPage.inviteAdmin('not-an-email', 'Дехто');
    await expect(teamPage.invitationFieldError()).toBeVisible();
  });

  test('a non-owner sees a load error instead of the team', async ({
    page,
    request,
    registerPage,
    teamPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Team Competition ${Date.now()}`,
    );
    await page.evaluate(() => window.localStorage.clear());

    await registerPage.open();
    await registerPage.registerAccount(TestAccountFactory.create('ORGANIZER'));

    await teamPage.open(competitionId);

    await expect(
      page.getByText('Не вдалося завантажити команду конкурсу. Спробуйте оновити сторінку.'),
    ).toBeVisible();
    await expect(teamPage.addAdminButton()).not.toBeVisible();
  });

  test('a logged-out visitor is redirected to /login', async ({ page }) => {
    await page.goto(ROUTES.competitionTeam('00000000-0000-0000-0000-000000000000'));

    await expect(page).toHaveURL(ROUTES.LOGIN);
  });
});
