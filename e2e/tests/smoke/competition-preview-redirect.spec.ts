import { test, expect } from '../../src/fixtures/test.fixture';
import { ROUTES } from '../../src/constants/routes.constants';
import { SEEDED_COMPETITION } from '../../src/constants/test-data.constants';

test.describe('Competition preview redirect (/competitions/preview)', () => {
  test('redirects to the first competition returned by the API', async ({ page }) => {
    await page.goto(ROUTES.COMPETITION_PREVIEW);

    // The seeded competition is guaranteed to exist, so the list is never empty.
    await expect(page).toHaveURL(/\/competitions\/[0-9a-f-]{36}$/);
    await expect(page.getByRole('heading', { name: SEEDED_COMPETITION.NAME })).toBeVisible();
  });
});
