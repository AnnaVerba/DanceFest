import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';

/**
 * A signed-in participant or coach must supply the mandatory profile
 * fields before the app opens:
 *   - PARTICIPANT: a mentor coach (pick an existing one or name a new one),
 *   - COACH: a school AND a mentor coach.
 * The API rejects PATCH /users/me/profile when a required field is missing;
 * the UI holds the user on /complete-profile until it is filled.
 */

const PASSWORD = 'TestPass123!';
const MISSING_UUID = '00000000-0000-4000-8000-000000000000';

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function suffix(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`;
}

interface Registered {
  token: string;
  id: string;
}

async function registerParticipant(
  request: APIRequestContext,
): Promise<Registered> {
  const s = suffix();
  const res = await request.post(`${BACKEND_BASE_URL}/auth/register`, {
    data: {
      role: 'PARTICIPANT',
      firstName: 'Учасник',
      lastName: `Профіль${s}`,
      phone: `+38050${s.slice(-7)}`,
      email: `e2e.profile.p.${s}@example.com`,
      birthDate: '2001-02-03',
      password: PASSWORD,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as {
    accessToken: string;
    user: { id: string };
  };
  return { token: body.accessToken, id: body.user.id };
}

// POST /schools now needs a token; the caller supplies one.
async function createSchool(
  request: APIRequestContext,
  token: string,
): Promise<string> {
  const res = await request.post(`${BACKEND_BASE_URL}/schools`, {
    headers: bearer(token),
    data: { name: `E2E Школа ${suffix()}` },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return ((await res.json()) as { id: string }).id;
}

// A coach names their school later, via PATCH /users/me/profile.
async function registerCoach(request: APIRequestContext): Promise<Registered> {
  const s = suffix();
  const res = await request.post(`${BACKEND_BASE_URL}/auth/register`, {
    data: {
      role: 'COACH',
      firstName: 'Тренер',
      lastName: `Профіль${s}`,
      phone: `+38050${s.slice(-7)}`,
      email: `e2e.profile.c.${s}@example.com`,
      birthDate: '1988-02-03',
      password: PASSWORD,
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as {
    accessToken: string;
    user: { id: string };
  };
  return { token: body.accessToken, id: body.user.id };
}

function patchProfile(
  request: APIRequestContext,
  token: string,
  body: Record<string, unknown>,
) {
  return request.patch(`${BACKEND_BASE_URL}/users/me/profile`, {
    headers: bearer(token),
    data: body,
  });
}

function newCoachPayload() {
  const s = suffix();
  return {
    firstName: 'Ментор',
    lastName: `Тренер${s}`,
    phone: `+38066${s.slice(-7)}`,
  };
}

test.describe('Profile completion — API validation', () => {
  test('participant: coach is required', async ({ playwright }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerParticipant(request);

    const res = await patchProfile(request, token, {});
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('Вкажіть тренера');
    await request.dispose();
  });

  test('participant: cannot send both an existing and a new coach', async ({
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerParticipant(request);
    const mentor = await registerCoach(request);

    const res = await patchProfile(request, token, {
      coachId: mentor.id,
      newCoach: newCoachPayload(),
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('не обидва');
    await request.dispose();
  });

  test('participant: unknown coach id is rejected', async ({ playwright }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerParticipant(request);

    const res = await patchProfile(request, token, { coachId: MISSING_UUID });
    expect(res.status()).toBe(404);
    await request.dispose();
  });

  test('participant: a new coach completes the profile', async ({
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerParticipant(request);

    const res = await patchProfile(request, token, {
      newCoach: newCoachPayload(),
    });
    expect(res.ok(), await res.text()).toBeTruthy();

    const me = await request.get(`${BACKEND_BASE_URL}/users/me`, {
      headers: bearer(token),
    });
    const body = (await me.json()) as {
      coachId: string | null;
      profileComplete: boolean;
    };
    expect(body.coachId).not.toBeNull();
    expect(body.profileComplete).toBe(true);
    await request.dispose();
  });

  test('participant: an existing coach can be selected', async ({
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerParticipant(request);
    const mentor = await registerCoach(request);

    const res = await patchProfile(request, token, { coachId: mentor.id });
    expect(res.ok(), await res.text()).toBeTruthy();
    await request.dispose();
  });

  test('coach: school is required', async ({ playwright }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerCoach(request);

    const res = await patchProfile(request, token, {
      newCoach: newCoachPayload(),
    });
    expect(res.status()).toBe(400);
    expect(await res.text()).toContain('школу');
    await request.dispose();
  });

  test('coach: unknown school id is rejected', async ({ playwright }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerCoach(request);

    const res = await patchProfile(request, token, {
      schoolId: MISSING_UUID,
      newCoach: newCoachPayload(),
    });
    expect(res.status()).toBe(404);
    await request.dispose();
  });

  test('coach: school + new coach completes the profile', async ({
    playwright,
  }) => {
    const request = await playwright.request.newContext();
    const { token } = await registerCoach(request);
    const schoolId = await createSchool(request, token);

    const res = await patchProfile(request, token, {
      schoolId,
      newCoach: newCoachPayload(),
    });
    expect(res.ok(), await res.text()).toBeTruthy();

    const me = await request.get(`${BACKEND_BASE_URL}/users/me`, {
      headers: bearer(token),
    });
    expect(((await me.json()) as { profileComplete: boolean }).profileComplete).toBe(
      true,
    );
    await request.dispose();
  });
});

test.describe('Profile completion — UI gate', () => {
  const registerParticipantViaUi = async (page: Page): Promise<void> => {
    const s = suffix();
    await page.goto('/register');
    await page.getByRole('button', { name: 'Учасник' }).click();
    await page.getByLabel("Ім'я").fill('Учасник');
    await page.getByLabel('Прізвище').fill(`Гейт${s}`);
    await page.getByLabel('Телефон').fill(`+38050${s.slice(-7)}`);
    await page.getByLabel('Email').fill(`e2e.gate.${s}@example.com`);
    await page.getByLabel('Дата народження').fill('2001-02-03');
    await page.getByLabel('Пароль', { exact: true }).fill(PASSWORD);
    await page.getByLabel('Повторіть пароль').fill(PASSWORD);
    await page.getByRole('button', { name: 'Зареєструватися' }).click();
  };

  test('a fresh participant is held on /complete-profile until a coach is named', async ({
    page,
  }) => {
    await registerParticipantViaUi(page);

    await expect(page).toHaveURL(/\/complete-profile$/);
    await expect(
      page.getByRole('button', { name: 'Зберегти та продовжити' }),
    ).toBeDisabled();

    // The gate follows the user around the app.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/complete-profile$/);

    const s = suffix();
    await page.getByRole('button', { name: 'Додати нового' }).click();
    await page.getByPlaceholder('Імʼя').fill('Ментор');
    await page.getByPlaceholder('Прізвище').fill(`Тренер${s}`);
    await page.getByPlaceholder('Телефон').fill(`+38066${s.slice(-7)}`);
    await page
      .getByRole('button', { name: 'Зберегти та продовжити' })
      .click();

    await expect(page).toHaveURL(/\/profile$/);

    // Once complete, the screen is no longer reachable.
    await page.goto('/complete-profile');
    await expect(page).toHaveURL(/\/profile$/);
  });
});
