import { test, expect, type Page } from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';
import { SESSION_STORAGE_KEY } from '../../src/constants/storage.constants';

/**
 * Venues ("майданчики") are viewable by everyone; only organizers and
 * admins may change them.
 *
 * Uses a seeded competition that already has venues. Assumes the app runs
 * on :5173 / :4000.
 */

const COMPETITION_WITH_VENUES = 'eebba9f4-1f08-4496-963e-65ef2e1597a8';
const PASSWORD = 'TestPass123!';

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function registerCoachAndGetToken(page: Page): Promise<string> {
  const s = uniqueSuffix();

  await page.goto('/register');
  await page.getByRole('button', { name: 'Тренер' }).click();
  await page.getByLabel("Ім'я").fill('Коуч');
  await page.getByLabel('Прізвище').fill(`Тест${s}`);
  await page.getByLabel('Телефон').fill(`+38050${s.slice(-7)}`);
  await page.getByLabel('Email').fill(`e2e.venue.${s}@example.com`);
  await page.getByLabel('Дата народження').fill('1990-04-12');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Повторіть пароль').fill(PASSWORD);
  await page.getByPlaceholder('…або впишіть нову назву').fill(`E2E Студія ${s}`);
  await page.getByRole('button', { name: 'Додати' }).click();
  await page.getByRole('button', { name: 'Зареєструватися' }).click();
  await page.waitForURL('**/profile');

  const token = await page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw
      ? (JSON.parse(raw) as { accessToken: string }).accessToken
      : null;
  }, SESSION_STORAGE_KEY);
  expect(token).toBeTruthy();
  return token as string;
}

test.describe('Venue access', () => {
  test('venues are visible to an anonymous visitor', async ({ page }) => {
    await page.goto(`/competitions/${COMPETITION_WITH_VENUES}`);

    await expect(
      page.getByRole('heading', { name: 'Майданчики' }),
    ).toBeVisible();
    await expect(page.getByText('Велика сцена')).toBeVisible();
    await expect(page.getByText('Головна зала')).toBeVisible();
  });

  test('a coach viewing the venues tab sees the list, not organizer copy', async ({
    page,
  }) => {
    await registerCoachAndGetToken(page);

    await page.goto(`/competitions/${COMPETITION_WITH_VENUES}`);
    await page.getByRole('tab', { name: 'Майданчики' }).click();

    await expect(page.getByText('Велика сцена')).toBeVisible();
    await expect(
      page.getByText('Розподіліть готові номінації'),
    ).toHaveCount(0);
    await expect(page.getByText('не сформовано номінацій')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /Додати майданчик/ }),
    ).toHaveCount(0);
  });

  test('a coach cannot add a venue', async ({ page, request }) => {
    const token = await registerCoachAndGetToken(page);

    const res = await request.post(
      `${BACKEND_BASE_URL}/competitions/${COMPETITION_WITH_VENUES}/venues`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { name: `E2E scene ${uniqueSuffix()}` },
      },
    );
    expect(res.status()).toBe(403);
  });
});
