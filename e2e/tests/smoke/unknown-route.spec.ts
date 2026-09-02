import { test, expect } from '../../src/fixtures/test.fixture';
import { ROUTES } from '../../src/constants/routes.constants';

/**
 * qa-test.md item 13: unknown routes render a blank page — no 404 message, no
 * redirect. Documented as a minor but real UX gap, not fixed as of this suite.
 */
test.describe('Unknown routes', () => {
  test('an unmapped path renders a blank page rather than a 404 or redirect', async ({
    page,
  }) => {
    await page.goto(ROUTES.UNKNOWN_ROUTE_PROBE);

    await expect(page).toHaveURL(new RegExp(ROUTES.UNKNOWN_ROUTE_PROBE));
    await expect(page.getByRole('heading')).toHaveCount(0);
    await expect(page.getByRole('navigation')).toHaveCount(0);
  });
});
