import { test, expect, type Page } from '@playwright/test';

/**
 * Coach application flow (requested behaviours):
 *  1. On the apply form a coach can PICK a participant — their roster
 *     dancers AND themselves — not a locked self-only field.
 *  2. In "Мої заявки" a coach sees the entries submitted for their roster
 *     dancers.
 *  3. The line-up (Соло / Дуо / Тріо / Група) is decided by the system from
 *     the number of picked participants — not chosen by the applicant.
 *  4. Music is captured for improvisation rows too, from the applicant.
 *
 * Self-contained: drives the current UI directly. Assumes the app runs on
 * :5173 / :4000 with the seeded OPEN competition below.
 */

const OPEN_COMPETITION_ID = '22222222-2222-4222-8222-222222222222';
const OPEN_COMPETITION_NAME = 'Перлина Сходу 2026';
const LEAGUE = 'Дебют';
const PASSWORD = 'TestPass123!';

// The app renders names as "LastName FirstName".
function displayName(p: { firstName: string; lastName: string }): string {
  return `${p.lastName} ${p.firstName}`;
}

function uniqueSuffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

async function registerCoach(
  page: Page,
): Promise<{ firstName: string; lastName: string }> {
  const s = uniqueSuffix();
  const coach = { firstName: 'Коуч', lastName: `Тест${s}` };

  await page.goto('/register');
  await page.getByRole('button', { name: 'Тренер' }).click();
  await page.getByLabel("Ім'я").fill(coach.firstName);
  await page.getByLabel('Прізвище').fill(coach.lastName);
  await page.getByLabel('Телефон').fill(`+38050${s.slice(-7)}`);
  await page.getByLabel('Email').fill(`e2e.coach.${s}@example.com`);
  await page.getByLabel('Дата народження').fill('1990-04-12');
  await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Повторіть пароль').fill(PASSWORD);

  await page.getByPlaceholder('…або впишіть нову назву').fill(`E2E Студія ${s}`);
  await page.getByRole('button', { name: 'Додати' }).click();

  await page.getByRole('button', { name: 'Зареєструватися' }).click();
  await page.waitForURL('**/profile');
  return coach;
}

async function addRosterParticipant(
  page: Page,
  firstName: string,
): Promise<{ firstName: string; lastName: string }> {
  const s = uniqueSuffix();
  const dancer = { firstName, lastName: `Учасник${s}` };

  await page.goto('/my-participants');
  await page.getByRole('button', { name: '+ Додати' }).click();
  await page.getByPlaceholder('Імʼя').fill(dancer.firstName);
  await page.getByPlaceholder('Прізвище').fill(dancer.lastName);
  await page.getByPlaceholder('Телефон').fill(`+38063${s.slice(-7)}`);
  await page.locator('input[type="date"]').fill('2012-06-01');
  await page.getByRole('button', { name: 'Зберегти' }).click();

  await expect(page.getByText(displayName(dancer))).toBeVisible();
  return dancer;
}

test.describe('Coach applications', () => {
  test('coach picks a participant on the apply form and sees roster entries', async ({
    page,
  }) => {
    const coach = await registerCoach(page);
    const dancer = await addRosterParticipant(page, 'Даня');

    // Feature 1: the apply form offers BOTH the roster dancer and the coach
    // as pickable participants (not a read-only "you" field).
    await page.goto(`/competitions/${OPEN_COMPETITION_ID}/apply`);
    await expect(
      page.getByRole('button', { name: displayName(dancer) }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: displayName(coach) }),
    ).toBeVisible();

    // Two entries for the roster dancer, two different styles.
    for (const style of ['Фрі Денс', 'Табла']) {
      await page.goto(`/competitions/${OPEN_COMPETITION_ID}/apply`);
      await page.getByRole('button', { name: displayName(dancer) }).click();
      await page.getByRole('combobox').selectOption({ label: LEAGUE });
      await page.getByRole('button', { name: style, exact: true }).click();
      await page
        .getByRole('button', { name: new RegExp(`Соло.*${LEAGUE}.*${style}`) })
        .first()
        .click();
      await page.getByRole('button', { name: 'Надіслати заявку' }).click();
      await expect(page.getByText('Заявку надіслано!')).toBeVisible();
    }

    // Feature 2: "Мої заявки" shows them, under the coach heading.
    await page.goto('/my-entries');
    await expect(
      page.getByRole('heading', { name: 'Заявки моїх учасників' }),
    ).toBeVisible();
    await expect(page.getByText(OPEN_COMPETITION_NAME).first()).toBeVisible();
    expect(await page.locator('table tbody tr').count()).toBeGreaterThanOrEqual(
      2,
    );
  });

  test('line-up is auto-derived from participant count, and improv rows take music', async ({
    page,
  }) => {
    await registerCoach(page);
    const d1 = await addRosterParticipant(page, 'Оля');
    const d2 = await addRosterParticipant(page, 'Ніна');

    await page.goto(`/competitions/${OPEN_COMPETITION_ID}/apply`);
    const lineupBox = page.getByTestId('lineup-value');
    const soloRow = page.getByRole('button', { name: /^Соло .*Дебют · Табла/ });
    const duetRow = page.getByRole('button', { name: /^Дует .*Дебют · Табла/ });

    // One participant -> Соло; only solo nominations are offered.
    await page.getByRole('button', { name: displayName(d1) }).click();
    await expect(lineupBox).toHaveText('Соло');
    await page.getByRole('combobox').selectOption({ label: LEAGUE });
    await page.getByRole('button', { name: 'Табла', exact: true }).click();
    await expect(soloRow.first()).toBeVisible();
    await expect(duetRow).toHaveCount(0);

    // Two participants -> Дуо; solo nominations disappear, duet ones appear.
    await page.getByRole('button', { name: displayName(d2) }).click();
    await expect(lineupBox).toHaveText('Дуо');
    await expect(soloRow).toHaveCount(0);
    await expect(duetRow.first()).toBeVisible();

    // The improv row exists and its music slot is a file input the
    // applicant fills — not an "organiser provides it" note.
    const improvRow = page
      .getByRole('button', { name: /Табла · Імпровізація/ })
      .first();
    await expect(improvRow).toBeVisible();
    await improvRow.click();
    await expect(
      page.getByText('музику надасть організатор'),
    ).toHaveCount(0);
    await expect(page.locator('input[type="file"]')).toHaveCount(1);

    await page.getByRole('button', { name: 'Надіслати заявку' }).click();
    await expect(page.getByText('Заявку надіслано!')).toBeVisible();

    // The submitted entry is recorded as a duo.
    await page.goto('/my-entries');
    await expect(
      page.getByRole('columnheader', { name: 'Склад' }),
    ).toBeVisible();
    await expect(
      page.getByRole('cell', { name: 'Дуо', exact: true }).first(),
    ).toBeVisible();
  });

  test('a coach can submit an application for themselves', async ({ page }) => {
    const coach = await registerCoach(page);
    await addRosterParticipant(page, 'Тарас');

    await page.goto(`/competitions/${OPEN_COMPETITION_ID}/apply`);
    await page.getByRole('button', { name: displayName(coach) }).click();
    await page.getByRole('combobox').selectOption({ label: LEAGUE });
    await page.getByRole('button', { name: 'Фрі Денс', exact: true }).click();
    await page
      .getByRole('button', { name: new RegExp(`Соло.*${LEAGUE}.*Фрі Денс`) })
      .first()
      .click();

    await page.getByRole('button', { name: 'Надіслати заявку' }).click();
    await expect(page.getByText('Заявку надіслано!')).toBeVisible();
  });

  test('"Ваш тренер" shows the details of the mentor coach', async ({
    page,
  }) => {
    await registerCoach(page);

    await page.goto('/profile');
    const card = page
      .locator('section', { hasText: 'Ваш тренер' })
      .first();
    await expect(card.getByText('Не вказано')).toBeVisible();

    // Name an off-system mentor.
    await card.getByRole('button', { name: 'Вписати нового' }).click();
    await card.getByPlaceholder('Імʼя').fill('Петро');
    await card.getByPlaceholder('Прізвище').fill('Наставник');
    await card.getByPlaceholder('Телефон').fill('+380509998877');
    await card.getByRole('button', { name: 'Зберегти' }).click();

    // The section now renders that coach's data, flagged as unconfirmed.
    await expect(card.getByText('Наставник Петро')).toBeVisible();
    await expect(card.getByText('+380509998877')).toBeVisible();
    await expect(card.getByText(/Непідтверджений/)).toBeVisible();
  });

  test('the "Обрати тренера" list is searchable by name', async ({ page }) => {
    const mentor = await registerCoach(page); // coach A — will be picked
    await page.evaluate(() => window.localStorage.clear());
    await registerCoach(page); // coach B — does the picking

    await page.goto('/profile');
    const card = page
      .locator('section', { hasText: 'Ваш тренер' })
      .first();
    await card.getByRole('button', { name: 'Обрати' }).click();

    const box = card.getByPlaceholder("Почніть вводити ім'я тренера…");
    await box.fill('немаєтакого');
    await expect(card.getByText('Нікого не знайдено')).toBeVisible();

    await box.fill(mentor.lastName);
    const suggestion = card.getByRole('button', {
      name: new RegExp(`${mentor.lastName} ${mentor.firstName}`),
    });
    await expect(suggestion).toBeVisible();
    await suggestion.click();
    await card.getByRole('button', { name: 'Зберегти' }).click();

    await expect(
      card.getByText(`${mentor.lastName} ${mentor.firstName}`),
    ).toBeVisible();
  });

  test('a coach is bounced back from the organizer dashboard', async ({
    page,
  }) => {
    await registerCoach(page); // ends on /profile
    await page.goto('/my-entries');
    await page.goto('/dashboard');

    await expect(page).not.toHaveURL(/\/dashboard$/);
    await expect(page).toHaveURL(/\/my-entries$/);
  });

  test('the cabinet nav has a Конкурси link that opens the public list', async ({
    page,
  }) => {
    await registerCoach(page);
    await page.goto('/profile');

    await page
      .getByRole('complementary')
      .getByRole('link', { name: 'Конкурси' })
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(
      page.getByRole('heading', { name: 'Конкурси східного танцю' }),
    ).toBeVisible();
  });

  test('the side nav shows on every page for a signed-in user, and not when logged out', async ({
    page,
  }) => {
    await registerCoach(page);

    // Signed in: the rail is present on the home page and on my-entries.
    await page.goto('/');
    await expect(page.getByRole('complementary')).toBeVisible();
    await expect(
      page.getByRole('complementary').getByRole('link', { name: 'Профіль' }),
    ).toBeVisible();

    await page.goto('/my-entries');
    await expect(page.getByRole('complementary')).toBeVisible();
    // "Мої заявки" no longer lists open competitions.
    await expect(page.getByText('Відкриті конкурси')).toHaveCount(0);

    // Logged out: no rail on the home page.
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('/');
    await expect(page.getByRole('complementary')).toHaveCount(0);

    // A stale / malformed session entry must also count as logged out.
    await page.evaluate(() =>
      window.localStorage.setItem('dansefest.session', '{"accessToken":"x"}'),
    );
    await page.goto('/');
    await expect(page.getByRole('complementary')).toHaveCount(0);
  });

  test('the cabinet nav stays pinned to the left and keeps its size between pages', async ({
    page,
  }) => {
    await registerCoach(page);
    await addRosterParticipant(page, 'Ліда');

    const boxes: Array<{ x: number; width: number }> = [];
    for (const path of ['/', '/profile', '/my-participants', '/my-entries']) {
      await page.goto(path);
      const rail = page.getByRole('complementary');
      await expect(rail).toBeVisible();
      const box = await rail.boundingBox();
      expect(box).not.toBeNull();
      boxes.push({ x: box!.x, width: box!.width });
    }

    for (const box of boxes) {
      expect(box.x).toBe(boxes[0].x); // never shifts horizontally
      expect(box.width).toBe(boxes[0].width); // never resizes
    }
    expect(boxes[0].x).toBeLessThanOrEqual(1); // flush to the left edge
  });
});
