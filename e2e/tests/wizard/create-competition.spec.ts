import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { SEEDED_ADMIN_ACCOUNT, OPEN_COMPETITION_DATES } from '../../src/constants/test-data.constants';
import { ROUTES } from '../../src/constants/routes.constants';

/**
 * The 7-step wizard (STEP_LABELS in NewCompetitionPage.tsx — the last step,
 * "Розподіл", is a read-only summary and needs no input).
 *
 * Run as the seeded Admin, not a fresh Organizer: an Organizer-owned
 * competition currently 500s on step 3's payment-details save (BUG-5, see
 * tests/known-bugs/bug-5-organizer-payment-details-fk.spec.ts), which would
 * make this test fail for a reason unrelated to the wizard mechanics under
 * test here.
 */
test.describe('Competition creation wizard (/competitions/new)', () => {
  test('completes all steps and the competition is created', async ({
    page,
    loginPage,
    categoryTemplateFormPage,
    newCompetitionPage,
    competitionDetailPage,
  }) => {
    await loginPage.open();
    await loginPage.login(SEEDED_ADMIN_ACCOUNT.EMAIL, SEEDED_ADMIN_ACCOUNT.PASSWORD, 'ADMIN');
    await expect(page).toHaveURL(ROUTES.DASHBOARD);

    const templateName = `E2E Wizard Template ${Date.now()}`;
    await categoryTemplateFormPage.openNew();
    await categoryTemplateFormPage.fillName(templateName);
    await categoryTemplateFormPage.makePublic();
    await categoryTemplateFormPage.addOneCompositionValueAndGenerate();
    const templateId = await categoryTemplateFormPage.submitAndGetId();
    await expect(page).toHaveURL(ROUTES.CATEGORY_TEMPLATES);

    const competitionName = `E2E Wizard Competition ${Date.now()}`;
    await newCompetitionPage.open();
    await expect(newCompetitionPage.heading()).toBeVisible();

    await newCompetitionPage.fillStep1({
      name: competitionName,
      description: 'Створено e2e-тестом майстра конкурсів.',
      dateFrom: OPEN_COMPETITION_DATES.DATE_FROM,
      dateTo: OPEN_COMPETITION_DATES.DATE_TO,
      location: 'м. Київ, Палац спорту',
      organizer: 'E2E Organizer',
      registrationFrom: OPEN_COMPETITION_DATES.REGISTRATION_FROM,
      registrationTo: OPEN_COMPETITION_DATES.REGISTRATION_TO,
    });
    await newCompetitionPage.goNext();

    await newCompetitionPage.fillStep2({
      contactNumber: '+380501234567',
      contactEmail: 'contest@example.com',
    });
    await newCompetitionPage.goNext();

    await newCompetitionPage.fillStep3({
      recipient: 'ФОП Е2Е Тест',
      account: 'UA123456780000026007233566001',
    });
    await newCompetitionPage.goNext();

    await newCompetitionPage.selectTemplate(templateId);
    await expect(page.getByText(/Буде створено/)).toBeVisible();
    await newCompetitionPage.goNext();

    // Step 5 (Майданчики) — optional, skipped.
    await newCompetitionPage.goNext();
    // Step 6 (Розподіл) — read-only summary, nothing to fill.

    await newCompetitionPage.submit();

    await page.waitForURL(/\/competitions\/[0-9a-f-]{36}$/);
    await expect(competitionDetailPage.heading(competitionName)).toBeVisible();
    // The creating Admin owns the new competition, so management actions show up.
    await expect(competitionDetailPage.editLink()).toBeVisible();
    await expect(competitionDetailPage.deleteButton()).toBeVisible();
  });

  test('step 1 blocks "Далі" and shows an inline error when the name is empty', async ({
    page,
    registerPage,
    newCompetitionPage,
  }) => {
    const organizer = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(organizer);

    await newCompetitionPage.open();
    await newCompetitionPage.goNext();

    await expect(newCompetitionPage.fieldErrorBanner()).toBeVisible();
    await expect(newCompetitionPage.nameFieldError()).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Загальне', selected: true })).toBeVisible();
  });
});
