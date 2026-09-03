import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Coach cabinet (/coach)', () => {
  test('shows the cabinet after registering', async ({ registerPage, coachCabinetPage }) => {
    const account = TestAccountFactory.create('COACH');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await coachCabinetPage.open();

    await expect(coachCabinetPage.eyebrow()).toBeVisible();
    // Not asserting the "no open competitions" empty state here: this suite's
    // own wizard/apply/team/edit specs seed real open-registration
    // competitions into the same shared dev database, so "zero open
    // competitions exist globally" is no longer a safe invariant (see the
    // equivalent note in cabinets/participant-cabinet.spec.ts).
  });

  test('adds a participant and lists them under "Мої учасники"', async ({
    registerPage,
    coachCabinetPage,
  }) => {
    const coach = TestAccountFactory.create('COACH');
    await registerPage.open();
    await registerPage.registerAccount(coach);

    await coachCabinetPage.open();
    await coachCabinetPage.openParticipantsTab();
    await expect(coachCabinetPage.noParticipantsMessage()).toBeVisible();

    const participant = TestAccountFactory.create('PARTICIPANT');
    await coachCabinetPage.addParticipant({
      firstName: participant.firstName,
      lastName: participant.lastName,
      phone: participant.phone,
      email: participant.email,
      password: participant.password,
    });

    const fullName = `${participant.firstName} ${participant.lastName}`;
    await expect(coachCabinetPage.participantRow(fullName)).toBeVisible();
    await expect(coachCabinetPage.noParticipantsMessage()).not.toBeVisible();
  });

  test('a participant added by a coach can log in and reach their own cabinet', async ({
    page,
    registerPage,
    loginPage,
    coachCabinetPage,
    participantCabinetPage,
  }) => {
    const coach = TestAccountFactory.create('COACH');
    await registerPage.open();
    await registerPage.registerAccount(coach);

    await coachCabinetPage.open();
    await coachCabinetPage.openParticipantsTab();
    const participant = TestAccountFactory.create('PARTICIPANT');
    await coachCabinetPage.addParticipant({
      firstName: participant.firstName,
      lastName: participant.lastName,
      phone: participant.phone,
      email: participant.email,
      password: participant.password,
    });
    await coachCabinetPage.clearSession();

    await loginPage.open();
    await loginPage.login(participant.email, participant.password, 'PARTICIPANT');

    await expect(page).toHaveURL(ROUTES.PROFILE);
    await expect(participantCabinetPage.eyebrow()).toBeVisible();
  });

  test('a PARTICIPANT account cannot reach the coach cabinet directly', async ({
    page,
    registerPage,
    coachCabinetPage,
  }) => {
    const account = TestAccountFactory.create('PARTICIPANT');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await coachCabinetPage.open();

    await expect(page).toHaveURL(ROUTES.PROFILE);
  });
});
