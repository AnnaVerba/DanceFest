import { test, expect } from '../../src/fixtures/test.fixture';
import { SEEDED_ADMIN_ACCOUNT } from '../../src/constants/test-data.constants';
import { ROUTES } from '../../src/constants/routes.constants';

/**
 * Happy-path creation, by the only role allowed to author templates (see
 * tests/category-templates/organizer-cannot-author.spec.ts for the negative
 * case). Not exercised anywhere else in this suite yet.
 */
test.describe('Admin creates a category template', () => {
  test('creates a public template and it appears in the list', async ({
    page,
    loginPage,
    categoryTemplateFormPage,
  }) => {
    await loginPage.open();
    await loginPage.login(SEEDED_ADMIN_ACCOUNT.EMAIL, SEEDED_ADMIN_ACCOUNT.PASSWORD, 'ADMIN');
    await expect(page).toHaveURL(ROUTES.DASHBOARD);

    const templateName = `E2E Template ${Date.now()}`;
    await categoryTemplateFormPage.openNew();
    await categoryTemplateFormPage.fillName(templateName);
    await categoryTemplateFormPage.makePublic();
    await categoryTemplateFormPage.addOneCompositionValueAndGenerate();
    await categoryTemplateFormPage.submit();

    await expect(page).toHaveURL(ROUTES.CATEGORY_TEMPLATES);
    const templateCard = page.getByRole('article').filter({ hasText: templateName });
    await expect(templateCard.getByRole('heading', { name: templateName, level: 2 })).toBeVisible();
    await expect(templateCard.getByText('Публічний', { exact: true })).toBeVisible();
  });
});
