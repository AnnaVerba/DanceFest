import { test, expect } from '../../src/fixtures/test.fixture';
import { SEEDED_COMPETITION } from '../../src/constants/test-data.constants';
import { UI_TEXT } from '../../src/constants/ui-text.constants';

/**
 * BUG-1 (qa-test.md): anonymous users used to be bounced to /login when opening a
 * competition card, even though the backend serves GET /competitions/{id} with 200 OK
 * for anonymous requests. Re-verified live on 2026-09-02: after restarting the frontend
 * dev server (it had been serving a stale build), this no longer reproduces — anonymous
 * users now reach the public detail page. Kept as a regression test so a future
 * regression here fails loudly instead of silently.
 */
test.describe('BUG-1 — anonymous competition browsing', () => {
  test('an anonymous visitor can open a competition card without being redirected to /login', async ({
    page,
    homePage,
    publicCompetitionPage,
  }) => {
    await homePage.open();
    await homePage.clearSession();
    await page.reload();

    await homePage.openCompetition(SEEDED_COMPETITION.NAME);

    await expect(page).toHaveURL(new RegExp(`/competitions/${SEEDED_COMPETITION.ID}$`));
    await expect(publicCompetitionPage.heading(SEEDED_COMPETITION.NAME)).toBeVisible();
    await expect(publicCompetitionPage.applyLink()).toBeVisible();
  });

  test('a direct link to a competition works for an anonymous visitor', async ({
    page,
    publicCompetitionPage,
  }) => {
    await publicCompetitionPage.open(SEEDED_COMPETITION.ID);
    await publicCompetitionPage.clearSession();
    await page.reload();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(publicCompetitionPage.heading(SEEDED_COMPETITION.NAME)).toBeVisible();
    await expect(publicCompetitionPage.applyLink()).toHaveAttribute(
      'href',
      `/competitions/${SEEDED_COMPETITION.ID}/apply`,
    );
  });
});

test.describe('Public homepage', () => {
  test('advertises browsing without requiring a session', async ({ page, homePage }) => {
    await homePage.open();
    await homePage.clearSession();
    await page.reload();

    await expect(homePage.heading()).toBeVisible();
    await expect(homePage.loginLink()).toBeVisible();
    await expect(homePage.competitionCard(SEEDED_COMPETITION.NAME)).toBeVisible();
  });

  test('shows the no-results message for a query with no matches', async ({ page }) => {
    await page.goto('/');
    await page.getByPlaceholder('Пошук за назвою, містом або організатором…').fill(
      'no-such-competition-xyz-e2e',
    );
    await expect(page.getByText(UI_TEXT.home.NO_RESULTS)).toBeVisible();
  });
});
