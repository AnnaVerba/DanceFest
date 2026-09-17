import { test, expect } from '../../src/fixtures/test.fixture';
import type { APIRequestContext } from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';
import { SESSION_STORAGE_KEY } from '../../src/constants/storage.constants';
import { CategoryTemplatesApiClient } from '../../src/api/category-templates-api.client';

/**
 * React Query caching for category templates — a reference the caching
 * strategy caches indefinitely (.claude/prompt-caching-strategy.md:
 * `staleTime: Infinity`, "оновлюються лише через явну інвалідацію після
 * редагування адміністратором").
 *
 * Uses the seeded mock admin, not a fresh Organizer registration — creating
 * a template as an Organizer currently 500s (BUG-2, unrelated to caching;
 * see tests/known-bugs/bug-2-category-template-creation.spec.ts).
 */
const MOCK_ADMIN = { login: 'mock@dansefest.local', password: 'mock1234' };

interface Session {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

async function loginAdmin(request: APIRequestContext): Promise<Session> {
  const res = await request.post(`${BACKEND_BASE_URL}/auth/login`, {
    data: MOCK_ADMIN,
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as Session;
}

test.describe('Category templates — Infinity-cached reference data', () => {
  let adminSession: Session;
  let requestCtx: APIRequestContext;
  let createdTemplateId: string | null = null;

  test.beforeAll(async ({ playwright }) => {
    requestCtx = await playwright.request.newContext();
    adminSession = await loginAdmin(requestCtx);
  });

  test.afterAll(async () => {
    if (createdTemplateId) {
      await new CategoryTemplatesApiClient(requestCtx).delete(
        createdTemplateId,
        adminSession.accessToken,
      );
    }
    await requestCtx.dispose();
  });

  test('a newly created template appears in the list without a manual reload', async ({
    page,
    categoryTemplateFormPage,
  }) => {
    await page.addInitScript(
      ([key, json]) => window.localStorage.setItem(key, json),
      [
        SESSION_STORAGE_KEY,
        JSON.stringify({
          accessToken: adminSession.accessToken,
          refreshToken: adminSession.refreshToken,
          profile: adminSession.user,
        }),
      ],
    );

    let listRequests = 0;
    page.on('request', (req) => {
      if (
        req.method() === 'GET' &&
        new URL(req.url()).pathname === '/category-templates'
      ) {
        listRequests += 1;
      }
    });

    const templateName = `E2E Cache Template ${Date.now()}`;
    await page.goto('/category-templates');
    await expect.poll(() => listRequests).toBe(1);

    await page.getByRole('link', { name: 'Створити шаблон' }).click();
    await categoryTemplateFormPage.fillName(templateName);
    await categoryTemplateFormPage.addOneCompositionValueAndGenerate();

    const createResponse = page.waitForResponse(
      (res) =>
        res.url().endsWith('/category-templates') && res.request().method() === 'POST',
    );
    await categoryTemplateFormPage.submit();
    const response = await createResponse;
    expect(response.ok(), await response.text()).toBe(true);
    createdTemplateId = ((await response.json()) as { id: string }).id;

    // The form's own success path redirects back to the list — no reload.
    await expect(page).toHaveURL('/category-templates');
    await expect(page.getByText(templateName)).toBeVisible();

    // A second, unrelated GET happened as part of invalidating the list
    // (that's the fix under test) — but simply revisiting the page again
    // afterwards must not trigger a third. Navigating via the app's own
    // sidebar links (not page.goto, which would reload and trivially pass
    // regardless of caching) so the SPA session — and its cache — survives.
    const afterCreateCount = listRequests;
    const sidebar = page.getByRole('complementary');
    await sidebar.getByRole('link', { name: 'Мої конкурси' }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await sidebar.getByRole('link', { name: 'Шаблони категорій' }).click();
    await expect(page).toHaveURL(/\/category-templates$/);

    await expect(page.getByText(templateName)).toBeVisible({ timeout: 500 });
    expect(listRequests).toBe(afterCreateCount);
  });
});
