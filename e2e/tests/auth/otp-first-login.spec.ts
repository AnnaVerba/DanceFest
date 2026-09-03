import { test, expect, type Page } from '@playwright/test';

// SMS_PROVIDER=dev -> the code is always this.
const DEV_CODE = '1111';
const PASSWORD = 'TestPass123!';

function suffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

// Registers a coach, adds a roster dancer (a password-less account), then
// clears the session and returns that dancer's phone.
async function seedPasswordlessDancer(page: Page): Promise<string> {
  const s = suffix();
  await page.goto('/register');
  await page.getByRole('button', { name: 'Тренер' }).click();
  await page.getByLabel("Ім'я").fill('Коуч');
  await page.getByLabel('Прізвище').fill(`Тест${s}`);
  await page.getByLabel('Телефон').fill(`+38050${s.slice(-7)}`);
  await page.getByLabel('Email').fill(`e2e.otp.${s}@example.com`);
  await page.getByLabel('Дата народження').fill('1990-01-01');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Повторіть пароль').fill(PASSWORD);
  await page.getByPlaceholder('…або впишіть нову назву').fill(`E2E ${s}`);
  await page.getByRole('button', { name: 'Додати' }).click();
  await page.getByRole('button', { name: 'Зареєструватися' }).click();
  await page.waitForURL('**/profile');

  const dancerPhone = `+38063${s.slice(-7)}`;
  await page.goto('/my-participants');
  await page.getByRole('button', { name: '+ Додати' }).click();
  await page.getByPlaceholder('Імʼя').fill('Даня');
  await page.getByPlaceholder('Прізвище').fill(`Учасник${s}`);
  await page.getByPlaceholder('Телефон').fill(dancerPhone);
  await page.locator('input[type="date"]').fill('2012-06-01');
  await page.getByRole('button', { name: 'Зберегти' }).click();
  await expect(page.getByText(`Учасник${s} Даня`)).toBeVisible();

  await page.evaluate(() => window.localStorage.clear());
  return dancerPhone;
}

test.describe('First login via SMS OTP', () => {
  test('a pre-added account logs in with a code, then with a password', async ({
    page,
  }) => {
    const phone = await seedPasswordlessDancer(page);

    // First login: the participant fills login + a password on the normal
    // form; because it is their first time, the app intercepts with an OTP
    // confirmation screen instead of logging them straight in.
    await page.goto('/login');
    await page.getByLabel('Номер телефону або email').fill(phone);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();

    await expect(
      page.getByRole('heading', { name: 'Підтвердження' }),
    ).toBeVisible();
    await expect(page).not.toHaveURL(/\/profile$/);
    // the code screen names the (masked) phone it was sent to
    await expect(page.getByText(/Ми надіслали код на .*•.*\d{2}/)).toBeVisible();

    await page.getByLabel('Код із SMS').fill(DEV_CODE);
    await page.getByRole('button', { name: 'Підтвердити' }).click();
    await expect(page).toHaveURL(/\/profile$/);

    // Second login: same phone + password, straight in — no code screen.
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/login');
    await page.getByLabel('Номер телефону або email').fill(phone);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(
      page.getByRole('heading', { name: 'Підтвердження' }),
    ).toHaveCount(0);
  });

  test('a wrong code keeps the user on the confirmation screen', async ({
    page,
  }) => {
    const phone = await seedPasswordlessDancer(page);

    await page.goto('/login');
    await page.getByLabel('Номер телефону або email').fill(phone);
    await page.getByLabel('Пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Увійти' }).click();

    await page.getByLabel('Код із SMS').fill('0000');
    await page.getByRole('button', { name: 'Підтвердити' }).click();

    await expect(page.getByText(/Невірний|прострочений/)).toBeVisible();
    await expect(page).not.toHaveURL(/\/profile$/);
  });
});
