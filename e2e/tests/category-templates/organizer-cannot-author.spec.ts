import { test, expect } from '../../src/fixtures/test.fixture';
import { TestAccountFactory } from '../../src/utils/test-account.factory';
import { CategoryTemplatesApiClient } from '../../src/api/category-templates-api.client';
import { ROUTES } from '../../src/constants/routes.constants';

/**
 * Only an Admin may author a category template (create/update/fork/delete);
 * an Organizer can still browse and use one via "Використати" on
 * /category-templates. Confirmed by Developer 2026-09-02.
 *
 * (This reverses an earlier same-day change: `qa-test.md`'s BUG-2 was first
 * read as "an Organizer should be able to create a template" and briefly
 * "fixed" that way — `category_templates.authorId`'s DB foreign key to
 * `admins` was relaxed to polymorphic, same as `competitions.ownerId`.
 * Developer then clarified the intended rule is the opposite, so that schema
 * change was reverted and this RBAC restriction was added instead.)
 */
test.describe('Category templates are admin-authored only', () => {
  test('an Organizer is redirected away from the "new template" form', async ({
    page,
    registerPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await page.goto(ROUTES.CATEGORY_TEMPLATE_NEW);

    await expect(page).toHaveURL(ROUTES.CATEGORY_TEMPLATES);
  });

  test('an Organizer does not see the "Створити шаблон" button', async ({
    page,
    registerPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);

    await page.goto(ROUTES.CATEGORY_TEMPLATES);

    await expect(page.getByRole('link', { name: 'Створити шаблон' })).not.toBeVisible();
  });

  test('POST /category-templates rejects an Organizer with 403', async ({
    request,
    registerPage,
  }) => {
    const account = TestAccountFactory.create('ORGANIZER');
    await registerPage.open();
    await registerPage.registerAccount(account);
    const accessToken = await registerPage.getAccessToken();

    const response = await new CategoryTemplatesApiClient(request).create(accessToken!);

    expect(response.status()).toBe(403);
  });
});
