import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { CategoryTemplatesApiClient } from '../../src/api/category-templates-api.client';

interface CreatedTemplateResponse {
  id: string;
}

/**
 * BUG-2 (qa-test.md, re-confirmed live 2026-09-02): POST /category-templates
 * returns 500 for every submission. Root cause seen in the backend logs while
 * verifying this suite: the `category_templates_authorId_fkey` foreign key still
 * points at `admins`, so it's violated the moment an ORGANIZER (not seeded into
 * `admins`) is the author — a schema/ownership mismatch, not a frontend bug.
 * This fully blocks a brand-new Organizer from ever creating a competition with
 * custom categories, since they also have no pre-existing template to reuse.
 *
 * Expected/correct behavior once fixed: submitting a minimal, valid template
 * should succeed and land back on the templates list — not show a 500.
 *
 * `test.fail()` marks this as known-failing until the FK/ownership model is fixed.
 * Registered test accounts can't be deleted (no such API exists — see e2e/README.md),
 * but the template itself is cleaned up via the API the moment creation starts
 * succeeding, so this test stays self-cleaning once the bug is fixed.
 */
test.describe('BUG-2 — category template creation fails with 500', () => {
  test.fail();

  test('an Organizer can create a minimal category template', async ({
    page,
    request,
    registerPage,
    categoryTemplateFormPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await categoryTemplateFormPage.openNew();
    await categoryTemplateFormPage.fillName(`E2E Template ${account.email}`);
    await categoryTemplateFormPage.addOneCompositionValueAndGenerate();

    const createResponse = page.waitForResponse(
      (res) => res.url().endsWith('/category-templates') && res.request().method() === 'POST',
    );
    await categoryTemplateFormPage.submit();
    const response = await createResponse;

    try {
      expect(response.ok()).toBe(true);
      await expect(categoryTemplateFormPage.serverErrorMessage()).not.toBeVisible();
      await expect(page).toHaveURL('/category-templates');
    } finally {
      if (response.ok()) {
        const created = (await response.json()) as CreatedTemplateResponse;
        const accessToken = await categoryTemplateFormPage.getAccessToken();
        if (accessToken) {
          await new CategoryTemplatesApiClient(request).delete(created.id, accessToken);
        }
      }
    }
  });
});
