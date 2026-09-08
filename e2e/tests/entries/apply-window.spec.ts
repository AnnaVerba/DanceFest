import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';
import { SESSION_STORAGE_KEY } from '../../src/constants/storage.constants';

/**
 * Applications must not be submittable once the window has closed:
 *  - registration date passed  → blocked for participants & coaches,
 *    still open for organizers / admins
 *  - competition date passed   → blocked for everyone
 *
 * The button is hidden/disabled on every entry point, and the API rejects
 * the submission regardless of the UI.
 */

const MOCK_ADMIN = { login: 'mock@dansefest.local', password: 'mock1234' };

interface Session {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function isoDaysFromNow(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

async function loginAdmin(request: APIRequestContext): Promise<Session> {
  const res = await request.post(`${BACKEND_BASE_URL}/auth/login`, {
    data: MOCK_ADMIN,
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as Session;
}

async function registerParticipant(
  request: APIRequestContext,
): Promise<{ token: string; personId: string }> {
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const res = await request.post(`${BACKEND_BASE_URL}/auth/register`, {
    data: {
      role: 'PARTICIPANT',
      firstName: 'E2E',
      lastName: `Window${s}`,
      phone: `+38050${s.slice(-7)}`,
      email: `e2e.window.${s}@example.com`,
      birthDate: '1996-06-06',
      password: 'TestPass123!',
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  const body = (await res.json()) as Session;
  return {
    token: body.accessToken,
    personId: (body.user as { id: string }).id,
  };
}

async function createCompetition(
  request: APIRequestContext,
  token: string,
  overrides: Record<string, string>,
): Promise<{ competitionId: string; nominationId: string }> {
  const compRes = await request.post(`${BACKEND_BASE_URL}/competitions`, {
    headers: bearer(token),
    data: {
      name: `E2E Вікно ${Date.now()}${Math.random()}`,
      description: 'apply-window fixture',
      location: 'E2E Hall',
      organizers: ['E2E Org'],
      dateFrom: '2027-01-01',
      dateTo: '2027-01-02',
      registrationFrom: '2026-01-01',
      registrationTo: '2027-01-01',
      contactNumber: '+380501234567',
      contactEmail: 'e2e@example.com',
      ...overrides,
    },
  });
  expect(compRes.ok(), await compRes.text()).toBeTruthy();
  const competitionId = ((await compRes.json()) as { id: string }).id;

  const nomRes = await request.post(
    `${BACKEND_BASE_URL}/competitions/${competitionId}/nominations`,
    { headers: bearer(token), data: { name: 'E2E Соло · Дорослі · Дебют' } },
  );
  expect(nomRes.ok(), await nomRes.text()).toBeTruthy();
  const nominationId = ((await nomRes.json()) as { id: string }).id;
  return { competitionId, nominationId };
}

function submitEntry(
  request: APIRequestContext,
  competitionId: string,
  token: string,
  nominationId: string,
  personId: string,
) {
  return request.post(
    `${BACKEND_BASE_URL}/competitions/${competitionId}/entries`,
    {
      headers: bearer(token),
      data: {
        nominationId,
        participantIds: [personId],
        routineName: 'E2E номер',
      },
    },
  );
}

test.describe.serial('Application window', () => {
  let admin: Session;
  let request: APIRequestContext;

  // registration closed yesterday, competition still ahead
  let regClosed: { competitionId: string; nominationId: string };
  // competition ended yesterday
  let compOver: { competitionId: string; nominationId: string };

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
    admin = await loginAdmin(request);

    regClosed = await createCompetition(request, admin.accessToken, {
      registrationTo: isoDaysFromNow(-1),
      dateFrom: isoDaysFromNow(10),
      dateTo: isoDaysFromNow(11),
    });
    compOver = await createCompetition(request, admin.accessToken, {
      registrationFrom: isoDaysFromNow(-30),
      registrationTo: isoDaysFromNow(-10),
      dateFrom: isoDaysFromNow(-3),
      dateTo: isoDaysFromNow(-1),
    });
  });

  test.afterAll(async () => {
    for (const c of [regClosed, compOver]) {
      if (c?.competitionId) {
        await request.delete(
          `${BACKEND_BASE_URL}/competitions/${c.competitionId}`,
          { headers: bearer(admin.accessToken) },
        );
      }
    }
    await request.dispose();
  });

  test('API rejects a participant submission after registration closed', async () => {
    const { token, personId } = await registerParticipant(request);
    const res = await submitEntry(
      request,
      regClosed.competitionId,
      token,
      regClosed.nominationId,
      personId,
    );
    expect(res.status()).toBe(403);
    expect(await res.text()).toContain('Реєстрацію');
  });

  test('API still lets an organizer submit after registration closed', async () => {
    // The organizer has no birth date wired here, so submit for a fresh
    // registered person but as the admin token.
    const { personId } = await registerParticipant(request);
    const res = await submitEntry(
      request,
      regClosed.competitionId,
      admin.accessToken,
      regClosed.nominationId,
      personId,
    );
    expect(res.ok(), await res.text()).toBeTruthy();
  });

  test('API rejects everyone once the competition date has passed', async () => {
    const { personId } = await registerParticipant(request);
    const asAdmin = await submitEntry(
      request,
      compOver.competitionId,
      admin.accessToken,
      compOver.nominationId,
      personId,
    );
    expect(asAdmin.status()).toBe(403);
    expect(await asAdmin.text()).toContain('завершено');
  });

  test('public competition page disables the apply button', async ({
    page,
  }) => {
    await page.goto(`/competitions/${regClosed.competitionId}`);
    const btn = page.getByText('Подати заявку', { exact: true });
    await btn.waitFor();
    await expect(btn).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByText(/Реєстрацію.*закрито/)).toBeVisible();
  });

  test('apply page shows a blocked notice instead of the form', async ({
    page,
  }) => {
    const seedSession = async (p: Page, s: Session) => {
      const value = JSON.stringify({
        accessToken: s.accessToken,
        refreshToken: s.refreshToken,
        profile: s.user,
      });
      await p.addInitScript(
        ([key, json]) => window.localStorage.setItem(key, json),
        [SESSION_STORAGE_KEY, value],
      );
    };
    await seedSession(page, admin);

    await page.goto(`/competitions/${compOver.competitionId}/apply`);
    await expect(page.getByText(/Конкурс завершено/)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Надіслати/ }),
    ).toHaveCount(0);
  });
});
