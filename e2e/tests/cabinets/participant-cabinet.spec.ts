import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { ROUTES } from '../../src/constants/routes.constants';

test.describe('Participant cabinet (/profile)', () => {
  test('shows the cabinet and the open-competitions section after registering', async ({
    registerPage,
    participantCabinetPage,
  }) => {
    const account = TestAccountFactory.create('PARTICIPANT');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await participantCabinetPage.open();

    await expect(participantCabinetPage.eyebrow()).toBeVisible();
    // No seeded competition currently has registration open — see
    // src/constants/test-data.constants.ts SEEDED_COMPETITION — so this is the
    // deterministic state; the apply-link case is covered once a competition
    // with open registration is available to test against.
    await expect(participantCabinetPage.noOpenCompetitionsMessage()).toBeVisible();
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
