import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { OrganizerCompetitionFactory } from '../../src/utils/organizer-competition.factory';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Participant cabinet (/profile)', () => {
  test('shows the cabinet after registering', async ({ registerPage, participantCabinetPage }) => {
    const account = TestAccountFactory.create('PARTICIPANT');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await participantCabinetPage.open();

    await expect(participantCabinetPage.eyebrow()).toBeVisible();
    // Not asserting the "no open competitions" empty state here: this suite's
    // own wizard/apply/team/edit specs seed real open-registration
    // competitions into the same shared dev database (see
    // OrganizerCompetitionFactory), so "zero open competitions exist
    // globally" is no longer a safe invariant. The open-competitions case is
    // covered deterministically below instead.
  });

  test('an open-registration competition appears with a working apply link', async ({
    request,
    registerPage,
    participantCabinetPage,
  }) => {
    const competitionName = `E2E Open Competition ${Date.now()}`;
    await OrganizerCompetitionFactory.create(registerPage, request, competitionName);
    await participantCabinetPage.clearSession();

    await registerPage.open();
    await registerPage.registerAccount(TestAccountFactory.create('PARTICIPANT'));
    await participantCabinetPage.open();

    await expect(participantCabinetPage.competitionCard(competitionName)).toBeVisible();
    await expect(participantCabinetPage.applyLink(competitionName)).toHaveAttribute(
      'href',
      /\/apply$/,
    );
  });

  test('a COACH account cannot reach the participant cabinet directly', async ({
    page,
    registerPage,
    participantCabinetPage,
  }) => {
    const account = TestAccountFactory.create('COACH');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await participantCabinetPage.open();

    await expect(page).toHaveURL(ROUTES.COACH);
  });
});
