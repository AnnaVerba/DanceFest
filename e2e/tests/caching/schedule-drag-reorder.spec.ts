import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';
import { SESSION_STORAGE_KEY } from '../../src/constants/storage.constants';

/**
 * The one optimistic-update spot in the whole caching strategy
 * (.claude/prompt-caching-strategy.md, "Drag-and-Drop розкладу"): reordering
 * two performances in a built section with the ↑ / ↓ buttons.
 *
 * Covers the acceptance criteria:
 *  - the reorder responds before the server does (optimistic);
 *  - on a server error the order rolls back and the user sees a message;
 *  - after a real reload, the on-screen order matches what the server holds.
 *
 * Setup mirrors tests/schedule/schedule-and-timings.spec.ts: the seeded mock
 * admin creates a throwaway competition + nomination + two entries through
 * the API, builds one section holding both, then the UI test drags there.
 */
const MOCK_ADMIN = { login: 'mock@dansefest.local', password: 'mock1234' };
// Registration already closed, competition not yet started: canBuild=true
// (see SchedulePanel.tsx) without waiting on a real registration window.
const REGISTRATION_FROM = '2026-01-01';
const REGISTRATION_TO = '2026-02-01';
const DATE_FROM = '2026-12-01';
const DATE_TO = '2026-12-02';

interface Session {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}

async function loginAdmin(request: APIRequestContext): Promise<Session> {
  const res = await request.post(`${BACKEND_BASE_URL}/auth/login`, {
    data: MOCK_ADMIN,
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return (await res.json()) as Session;
}

async function seedBrowserSession(page: Page, session: Session): Promise<void> {
  const value = JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    profile: session.user,
  });
  await page.addInitScript(
    ([key, json]) => window.localStorage.setItem(key, json),
    [SESSION_STORAGE_KEY, value],
  );
}

interface Fixture {
  competitionId: string;
  sectionId: string;
  routineNames: [string, string];
}

async function createFixture(
  request: APIRequestContext,
  token: string,
): Promise<Fixture> {
  const compRes = await request.post(`${BACKEND_BASE_URL}/competitions`, {
    headers: bearer(token),
    data: {
      name: `E2E DnD Cache ${Date.now()}`,
      description: 'E2E drag-and-drop caching fixture',
      location: 'E2E Hall',
      organizers: ['E2E Org'],
      dateFrom: DATE_FROM,
      dateTo: DATE_TO,
      registrationFrom: REGISTRATION_FROM,
      registrationTo: REGISTRATION_TO,
      contactNumber: '+380501234567',
      contactEmail: 'e2e@example.com',
    },
  });
  expect(compRes.ok(), await compRes.text()).toBeTruthy();
  const competitionId = ((await compRes.json()) as { id: string }).id;

  const nomRes = await request.post(
    `${BACKEND_BASE_URL}/competitions/${competitionId}/nominations`,
    { headers: bearer(token), data: { name: 'E2E Соло · DnD' } },
  );
  expect(nomRes.ok(), await nomRes.text()).toBeTruthy();
  const nominationId = ((await nomRes.json()) as { id: string }).id;

  const routineNames: [string, string] = ['E2E-Alpha Routine', 'E2E-Bravo Routine'];
  const entryIds: string[] = [];
  for (const routineName of routineNames) {
    const entryRes = await request.post(
      `${BACKEND_BASE_URL}/competitions/${competitionId}/entries`,
      {
        headers: bearer(token),
        data: { nominationId, routineName, participantsCount: 1 },
      },
    );
    expect(entryRes.ok(), await entryRes.text()).toBeTruthy();
    entryIds.push(((await entryRes.json()) as { id: string }[])[0].id);
  }

  const daysRes = await request.get(
    `${BACKEND_BASE_URL}/competitions/${competitionId}/days`,
    { headers: bearer(token) },
  );
  const dayId = ((await daysRes.json()) as { id: string }[])[0].id;

  const sectionRes = await request.post(
    `${BACKEND_BASE_URL}/competitions/${competitionId}/sections`,
    {
      headers: bearer(token),
      data: { dayId, name: 'Відділення 1', startTime: '10:00', entryIds },
    },
  );
  expect(sectionRes.ok(), await sectionRes.text()).toBeTruthy();
  const sectionId = ((await sectionRes.json()) as { id: string }).id;

  return { competitionId, sectionId, routineNames };
}

// Where each routine name's text first appears in the rendered running
// order — lower index means it's rendered higher up in the table.
async function renderedOrder(page: Page, names: readonly string[]): Promise<string[]> {
  const text = await page.locator('table').first().innerText();
  return [...names].sort((a, b) => text.indexOf(a) - text.indexOf(b));
}

test.describe.serial('Schedule drag-and-drop — optimistic cache update', () => {
  let adminSession: Session;
  let fixture: Fixture;
  let requestCtx: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    requestCtx = await playwright.request.newContext();
    adminSession = await loginAdmin(requestCtx);
    fixture = await createFixture(requestCtx, adminSession.accessToken);
  });

  test.afterAll(async () => {
    if (fixture?.competitionId) {
      await requestCtx.delete(
        `${BACKEND_BASE_URL}/competitions/${fixture.competitionId}`,
        { headers: bearer(adminSession.accessToken) },
      );
    }
    await requestCtx.dispose();
  });

  test('reorder is instant, persists after reload, and rolls back on a server error', async ({
    page,
  }) => {
    await seedBrowserSession(page, adminSession);
    await page.goto(`/competitions/${fixture.competitionId}`);
    await page.getByRole('tab', { name: 'Програма' }).click();
    await page.getByRole('button', { name: 'Редагувати' }).click();

    const [first, second] = fixture.routineNames;
    await expect(page.getByText(first)).toBeVisible();
    expect(await renderedOrder(page, fixture.routineNames)).toEqual([
      first,
      second,
    ]);

    const REQUEST_DELAY_MS = 1500;
    // Throttling at the transport layer (not route interception, which
    // doesn't play well with re-dispatching a continued request) — every
    // request on the page is delayed, which is fine: nothing else is in
    // flight at the moment of the click.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: REQUEST_DELAY_MS,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    // --- Optimistic: the swap shows up before the delayed response lands.
    const rowOf = (name: string) => page.locator('tr', { hasText: name });
    const orderResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/sections/${fixture.sectionId}/order`) &&
        res.request().method() === 'PATCH',
    );
    await rowOf(first).getByRole('button', { name: '↓', exact: true }).click();

    // Still in flight (throttled), yet the DOM already reflects the swap —
    // the defining behavior of an optimistic update. Checked immediately,
    // well inside REQUEST_DELAY_MS.
    expect(await renderedOrder(page, fixture.routineNames)).toEqual([
      second,
      first,
    ]);

    // The server's recalculated section lands and confirms the same order.
    await expect
      .poll(() => renderedOrder(page, fixture.routineNames), {
        timeout: REQUEST_DELAY_MS * 4,
      })
      .toEqual([second, first]);
    // The poll above can pass on its very first (immediate) check — the
    // optimistic DOM already equals the target order, so it proves nothing
    // about the delayed PATCH actually landing. Wait for the real response
    // before untethering the network throttle and reloading, or the
    // persistence check below could race the server's own write.
    await orderResponse;
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    });

    // --- Persistence: a real reload shows the server's own order, not a
    // client-side artifact of the optimistic patch.
    await page.reload();
    await page.getByRole('tab', { name: 'Програма' }).click();
    await expect(page.getByText(first)).toBeVisible();
    expect(await renderedOrder(page, fixture.routineNames)).toEqual([
      second,
      first,
    ]);

    // --- Rollback: the next reorder fails server-side; the optimistic swap
    // must revert and the user must see an error. Throttled again so the
    // optimistic frame is observable before the (mocked) failure lands.
    await page.getByRole('button', { name: 'Редагувати' }).click();
    // route.fulfill() is served locally and isn't subject to the CDP
    // network throttle above (that only slows real network traffic), so
    // this one needs its own explicit delay to stay observably in flight.
    const orderRoute = `**/competitions/${fixture.competitionId}/sections/${fixture.sectionId}/order`;
    await page.route(orderRoute, async (route) => {
      await new Promise((r) => setTimeout(r, REQUEST_DELAY_MS));
      await route.fulfill({ status: 500, contentType: 'application/json', body: '{}' });
    });

    await rowOf(second).getByRole('button', { name: '↓', exact: true }).click();
    // Optimistic swap fires immediately, same as before...
    expect(await renderedOrder(page, fixture.routineNames)).toEqual([
      first,
      second,
    ]);
    // ...then the failure rolls it back to what the server actually holds.
    await expect(page.getByText('Не вдалося змінити порядок.')).toBeVisible({
      timeout: REQUEST_DELAY_MS * 4,
    });
    await expect
      .poll(() => renderedOrder(page, fixture.routineNames), {
        timeout: REQUEST_DELAY_MS * 4,
      })
      .toEqual([second, first]);
    await page.unroute(orderRoute);
  });
});
