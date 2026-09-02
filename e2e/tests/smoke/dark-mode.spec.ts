import { test, expect } from '../../src/fixtures/test.fixture';

const LABEL_ENABLE_DARK = 'Увімкнути темну тему';
const LABEL_ENABLE_LIGHT = 'Увімкнути світлу тему';

test.describe('Dark mode toggle', () => {
  test('flips the toggle label and persists the preference across a reload', async ({
    page,
  }) => {
    await page.goto('/');
    const toggle = page.getByRole('button', { name: LABEL_ENABLE_DARK }).or(
      page.getByRole('button', { name: LABEL_ENABLE_LIGHT }),
    );

    const wasDark = await page.getByRole('button', { name: LABEL_ENABLE_LIGHT }).isVisible();
    await toggle.click();

    const expectedLabelAfterToggle = wasDark ? LABEL_ENABLE_DARK : LABEL_ENABLE_LIGHT;
    await expect(page.getByRole('button', { name: expectedLabelAfterToggle })).toBeVisible();

    await page.reload();
    await expect(page.getByRole('button', { name: expectedLabelAfterToggle })).toBeVisible();
  });
});
