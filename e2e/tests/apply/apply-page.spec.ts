import { test, expect } from '../../src/fixtures/test.fixture';
import { OrganizerCompetitionFactory } from '../../src/utils/organizer-competition.factory';
import { CompetitionsApiClient } from '../../src/api/competitions-api.client';
import { ROUTES } from '../../src/constants/routes.constants';

/**
 * ApplyPage.tsx itself has no `getToken()`/`Navigate` gate, so the form loads
 * and can be filled in while fully logged out. But `POST /competitions/:id/entries`
 * now requires a logged-in account (`entries.controller.ts`: "Requires a
 * logged-in account" — a deliberate product change, matching the homepage
 * copy "заявка подається з кабінету тренера або учасника"). `createEntry`
 * goes through `authorizedFetch`, whose own 401-handling then redirects an
 * anonymous submitter to /login. This supersedes the older
 * "anonymous submission works" note in e2e/README.md — re-verified live here.
 */
test.describe('Apply page (/apply, /competitions/:id/apply)', () => {
  test('an anonymous visitor can open the form, but submitting redirects to /login', async ({
    page,
    request,
    registerPage,
    applyPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Apply Competition ${Date.now()}`,
    );
    const accessToken = await registerPage.getAccessToken();
    const nominationName = `E2E Nomination ${Date.now()}`;
    await new CompetitionsApiClient(request).addNomination(
      accessToken!,
      competitionId,
      nominationName,
    );
    await page.evaluate(() => window.localStorage.clear());

    await applyPage.open(competitionId);
    await expect(applyPage.titleInput()).toBeVisible();
    await applyPage.fillAndSubmit(`E2E Routine ${Date.now()}`, nominationName);

    await expect(page).toHaveURL(ROUTES.LOGIN);
  });

  test('a logged-in participant can submit an entry too', async ({
    request,
    registerPage,
    applyPage,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Apply Competition ${Date.now()}`,
    );
    const accessToken = await registerPage.getAccessToken();
    const nominationName = `E2E Nomination ${Date.now()}`;
    await new CompetitionsApiClient(request).addNomination(
      accessToken!,
      competitionId,
      nominationName,
    );

    await applyPage.open(competitionId);
    await applyPage.fillAndSubmit(`E2E Routine ${Date.now()}`, nominationName);

    await expect(applyPage.successMessage()).toBeVisible();
  });

  test('/apply with no competition id shows a graceful explainer', async ({ applyPage }) => {
    await applyPage.openWithNoCompetition();

    await expect(applyPage.chooseCompetitionMessage()).toBeVisible();
  });

  test('a competition with no nominations yet shows an explicit message instead of an empty select', async ({
    request,
    registerPage,
    applyPage,
    page,
  }) => {
    const { competitionId } = await OrganizerCompetitionFactory.create(
      registerPage,
      request,
      `E2E Apply No Noms ${Date.now()}`,
    );

    await applyPage.open(competitionId);

    await expect(
      page.getByText('Для цього конкурсу ще не згенеровано номінацій.'),
    ).toBeVisible();
    await expect(applyPage.nominationSelect()).toBeDisabled();
  });
});
