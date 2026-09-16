import { test, expect, type Page } from '@playwright/test';
import { UI_TEXT } from '../../src/constants/ui-text.constants';

// The dev database accumulates competitions across every e2e run, so a
// specific seeded fixture isn't reliably on page 1 (24 per page) — picking
// whatever card renders first keeps this test independent of seed ordering.
function firstCompetitionCard(page: Page) {
  return page.locator('a[href^="/competitions/"]').first();
}

/**
 * React Query caching for the public competitions list
 * (.claude/prompt-caching-strategy.md: `staleTime: 10 * 60_000`).
 *
 * Proves the acceptance criterion "Повернення на попередню сторінку показує
 * дані миттєво, без спінера" by counting real network requests to
 * `GET /competitions` — a cache hit means that count stays at 1 no matter
 * how many times the list is revisited within the staleTime window.
 */
test.describe('Public competitions list — cache on revisit', () => {
  test('returning from a competition page does not refetch the list', async ({
    page,
  }) => {
    let listRequests = 0;
    page.on('request', (req) => {
      if (req.method() === 'GET' && new URL(req.url()).pathname === '/competitions') {
        listRequests += 1;
      }
    });

    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: UI_TEXT.home.HEADING, level: 1 }),
    ).toBeVisible();
    await expect(firstCompetitionCard(page)).toBeVisible();
    await expect.poll(() => listRequests).toBe(1);

    const href = await firstCompetitionCard(page).getAttribute('href');
    await firstCompetitionCard(page).click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));

    // Back to the list via the app's own link, not a reload — a reload
    // would trivially "work" regardless of caching.
    await page.getByRole('link', { name: UI_TEXT.publicCompetition.BACK_LINK }).click();
    await expect(
      page.getByRole('heading', { name: UI_TEXT.home.HEADING, level: 1 }),
    ).toBeVisible();

    // No second request — the cached, still-fresh list served the revisit.
    expect(listRequests).toBe(1);
  });

  test('the list appears instantly on revisit, not behind a loading state', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: UI_TEXT.home.HEADING, level: 1 }),
    ).toBeVisible();
    await expect(firstCompetitionCard(page)).toBeVisible();
    const href = await firstCompetitionCard(page).getAttribute('href');

    await firstCompetitionCard(page).click();
    await expect(page.getByRole('link', { name: UI_TEXT.publicCompetition.BACK_LINK })).toBeVisible();
    await page.getByRole('link', { name: UI_TEXT.publicCompetition.BACK_LINK }).click();

    // A cache hit renders synchronously with the data already in hand — a
    // tight timeout here would fail if the page fell back to a fresh fetch.
    await expect(page.locator(`a[href="${href}"]`).first()).toBeVisible({
      timeout: 500,
    });
  });
});
