import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { BACKEND_BASE_URL } from '../../src/constants/env.constants';
import { SESSION_STORAGE_KEY } from '../../src/constants/storage.constants';

/**
 * End-to-end coverage for the festival "Програма" + "Таймінги" feature:
 * per-league timing rules, building sections, the freeze / explicit-
 * recalculate contract, manual break rows, section reordering, the
 * multi-day split, the name-free public projection, and access control.
 *
 * Setup runs through the API as the seeded mock admin
 * (mock@dansefest.local), which owns whatever it creates. A fresh 3-day
 * competition + nomination + 5 hand-added entries are torn down
 * afterwards. Assumes the app runs on :5173 / :4000 (see e2e/README.md).
 */

const MOCK_ADMIN = { login: 'mock@dansefest.local', password: 'mock1234' };
const DEFAULT_LIMIT_SECONDS = 180;

interface Session {
  accessToken: string;
  refreshToken: string;
  user: Record<string, unknown>;
}

interface SectionItemView {
  id: string;
  type: 'performance' | 'award' | 'break' | 'gala';
  label: string | null;
  time: string;
  startTimeSeconds: number;
  durationSeconds: number | null;
}
interface SectionView {
  id: string;
  name: string;
  dayId: string;
  dayDate: string | null;
  pauseSeconds: number;
  items: SectionItemView[];
}

interface RowPaged<T> {
  rows: T[];
  totalSections: number;
  pageCount: number;
  page: number;
  rangeStart: number;
  rangeEnd: number;
}
interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
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

async function registerParticipant(
  request: APIRequestContext,
): Promise<string> {
  const s = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const res = await request.post(`${BACKEND_BASE_URL}/auth/register`, {
    data: {
      role: 'PARTICIPANT',
      firstName: 'E2E',
      lastName: `Sched${s}`,
      phone: `+38050${s.slice(-7)}`,
      email: `e2e.sched.${s}@example.com`,
      birthDate: '1996-06-06',
      password: 'TestPass123!',
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  return ((await res.json()) as Session).accessToken;
}

interface Fixture {
  competitionId: string;
  nominationId: string;
  dancers: string[];
}

async function createFixture(
  request: APIRequestContext,
  token: string,
): Promise<Fixture> {
  const compRes = await request.post(`${BACKEND_BASE_URL}/competitions`, {
    headers: bearer(token),
    data: {
      name: `E2E Розклад ${Date.now()}`,
      description: 'E2E schedule + timings fixture',
      location: 'E2E Hall',
      organizer: 'E2E Org',
      dateFrom: '2026-12-01',
      dateTo: '2026-12-03',
      registrationFrom: '2026-11-01',
      registrationTo: '2026-11-25',
      contactNumber: '+380501234567',
      contactEmail: 'e2e@example.com',
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

  const dancers = [
    'Іваненко Марія',
    'Петренко Софія',
    'Коваль Олена',
    'Шевченко Дарина',
    'Бондаренко Ліана',
  ];
  for (const routineName of dancers) {
    const entryRes = await request.post(
      `${BACKEND_BASE_URL}/competitions/${competitionId}/entries`,
      {
        headers: bearer(token),
        data: {
          nominationId,
          routineName,
          participantsCount: 1,
          studioName: 'E2E Студія',
          choreographer: 'E2E Тренер',
        },
      },
    );
    expect(entryRes.ok(), await entryRes.text()).toBeTruthy();
  }

  return { competitionId, nominationId, dancers };
}

async function seedBrowserSession(page: Page, session: Session): Promise<void> {
  // The frontend session shape uses `profile`, not `user`.
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

test.describe.serial('Програма та таймінги', () => {
  let adminSession: Session;
  let fixture: Fixture;
  let dayIds: string[] = [];

  let requestCtx: APIRequestContext;

  const api = (suffix = '') =>
    `${BACKEND_BASE_URL}/competitions/${fixture.competitionId}${suffix}`;

  async function fetchJson<T>(
    suffix: string,
    token = adminSession.accessToken,
  ): Promise<T> {
    const res = await requestCtx.get(api(suffix), { headers: bearer(token) });
    expect(res.ok(), `${suffix}: ${await res.text()}`).toBeTruthy();
    return (await res.json()) as T;
  }

  // `/sections` and `/program` now page by row (whole sections up to ~60
  // running-order rows); `/performances/unassigned` pages by entry.
  const fetchSections = (query = '') =>
    fetchJson<RowPaged<SectionView>>(`/sections${query}`).then((p) => p.rows);
  const fetchUnassigned = () =>
    fetchJson<Paged<{ id: string }>>('/performances/unassigned').then(
      (p) => p.rows,
    );

  test.beforeAll(async ({ playwright }) => {
    // A fixture-independent context so the helpers can be shared by every
    // test (Playwright forbids reusing the beforeAll `request` fixture).
    requestCtx = await playwright.request.newContext();
    adminSession = await loginAdmin(requestCtx);
    fixture = await createFixture(requestCtx, adminSession.accessToken);

    dayIds = (await fetchJson<{ id: string }[]>('/days')).map((d) => d.id);
    expect(dayIds).toHaveLength(3);
  });

  test.afterAll(async () => {
    if (fixture?.competitionId) {
      await requestCtx.delete(api(), {
        headers: bearer(adminSession.accessToken),
      });
    }
    await requestCtx.dispose();
  });

  test('per-league timing rules round-trip through PATCH /rules', async () => {
    const res = await requestCtx.patch(api('/rules'), {
      headers: bearer(adminSession.accessToken),
      data: {
        pauseSeconds: 20,
        leagueLimits: { Дебют: 95, ' Профі ': 150, Порожня: 0 },
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();

    const rules = await fetchJson<{
      pauseSeconds: number;
      leagueLimits: Record<string, number>;
    }>('/rules');
    expect(rules.pauseSeconds).toBe(20);
    // keys stored trimmed; the 0-second "Порожня" entry is dropped.
    expect(rules.leagueLimits).toEqual({ 'Дебют': 95, 'Профі': 150 });
  });

  test('building a section computes on-stage times from the start', async () => {
    const pool = await fetchUnassigned();
    expect(pool).toHaveLength(5);

    const res = await requestCtx.post(api('/sections'), {
      headers: bearer(adminSession.accessToken),
      data: {
        dayId: dayIds[0],
        name: 'Відділення 1',
        startTime: '10:00',
        entryIds: [pool[0].id, pool[1].id],
      },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const section = (await res.json()) as SectionView;

    const perf = section.items.filter((i) => i.type === 'performance');
    const award = section.items.find((i) => i.type === 'award');
    expect(perf).toHaveLength(2);
    expect(award).toBeTruthy();

    const step = DEFAULT_LIMIT_SECONDS + section.pauseSeconds; // 180 + 20
    expect(perf[0].time).toBe('10:00:00');
    expect(perf[1].startTimeSeconds - perf[0].startTimeSeconds).toBe(step);
    expect(award!.startTimeSeconds - perf[0].startTimeSeconds).toBe(step * 2);
  });

  test('the unassigned pool pages and exposes facets + all ids', async () => {
    // Runs while entries are still unassigned (3 of 5 left at this point).
    const page = await fetchJson<Paged<{ id: string }>>(
      '/performances/unassigned?pageSize=2',
    );
    expect(page.pageSize).toBe(2);
    expect(page.rows.length).toBeLessThanOrEqual(2);
    expect(page.total).toBeGreaterThan(0);

    const ids = await fetchJson<string[]>('/performances/unassigned/ids');
    expect(ids).toHaveLength(page.total);

    const facets = await fetchJson<{
      leagues: string[];
      ageCategories: string[];
    }>('/performances/unassigned/facets');
    expect(Array.isArray(facets.leagues)).toBeTruthy();
    expect(Array.isArray(facets.ageCategories)).toBeTruthy();
  });

  test('sections of one day can be reordered', async () => {
    const pool = await fetchUnassigned();
    const build2 = await requestCtx.post(api('/sections'), {
      headers: bearer(adminSession.accessToken),
      data: {
        dayId: dayIds[0],
        name: 'Відділення 2',
        startTime: '14:00',
        entryIds: [pool[0].id, pool[1].id],
      },
    });
    expect(build2.ok(), await build2.text()).toBeTruthy();

    const before = await fetchSections(`?dayId=${dayIds[0]}`);
    expect(before.map((s) => s.name)).toEqual(['Відділення 1', 'Відділення 2']);

    const reorder = await requestCtx.post(api('/schedule/reorder-sections'), {
      headers: bearer(adminSession.accessToken),
      data: { dayId: dayIds[0], sectionIds: [before[1].id, before[0].id] },
    });
    expect(reorder.ok(), await reorder.text()).toBeTruthy();

    const after = await fetchSections(`?dayId=${dayIds[0]}`);
    expect(after.map((s) => s.name)).toEqual(['Відділення 2', 'Відділення 1']);

    // restore original order for the later assertions
    await requestCtx.post(api('/schedule/reorder-sections'), {
      headers: bearer(adminSession.accessToken),
      data: { dayId: dayIds[0], sectionIds: [before[0].id, before[1].id] },
    });
  });

  test('a pause change does not reflow until an explicit recalculate', async () => {
    const section1 = () =>
      fetchSections(`?dayId=${dayIds[0]}`).then((s) =>
        s.find((x) => x.name === 'Відділення 1'),
      );

    const before = await section1();
    const awardBefore = before!.items.find((i) => i.type === 'award')!;

    await requestCtx.patch(api('/rules'), {
      headers: bearer(adminSession.accessToken),
      data: { pauseSeconds: 40 },
    });

    const mid = await section1();
    expect(
      mid!.items.find((i) => i.type === 'award')!.startTimeSeconds,
    ).toBe(awardBefore.startTimeSeconds);

    await requestCtx.post(api('/schedule/recalculate'), {
      headers: bearer(adminSession.accessToken),
      data: {},
    });
    const after = await section1();
    // +20s pause per performance, 2 performances in Відділення 1
    expect(
      after!.items.find((i) => i.type === 'award')!.startTimeSeconds,
    ).toBe(awardBefore.startTimeSeconds + 20 * 2);

    await requestCtx.patch(api('/rules'), {
      headers: bearer(adminSession.accessToken),
      data: { pauseSeconds: 20 },
    });
    await requestCtx.post(api('/schedule/recalculate'), {
      headers: bearer(adminSession.accessToken),
      data: {},
    });
  });

  test('a manual break row runs for its own length, no pause after', async () => {
    const [section] = await fetchSections(`?dayId=${dayIds[0]}`);
    const awardBefore = section.items.find((i) => i.type === 'award')!;

    const res = await requestCtx.post(api(`/sections/${section.id}/rows`), {
      headers: bearer(adminSession.accessToken),
      data: { type: 'break', label: 'Обід', durationSeconds: 900 },
    });
    expect(res.ok(), await res.text()).toBeTruthy();
    const updated = (await res.json()) as SectionView;

    expect(updated.items.find((i) => i.type === 'break')?.label).toBe('Обід');
    const awardAfter = updated.items.find((i) => i.type === 'award')!;
    expect(awardAfter.startTimeSeconds - awardBefore.startTimeSeconds).toBe(900);

    // remove it so later assertions on section order/labels stay simple
    const breakId = updated.items.find((i) => i.type === 'break')!.id;
    await requestCtx.delete(api(`/sections/${section.id}/rows/${breakId}`), {
      headers: bearer(adminSession.accessToken),
    });
  });

  test('the program spans days and the dayId filter narrows it', async () => {
    const pool = await fetchUnassigned();
    expect(pool.length).toBeGreaterThan(0);

    const day2 = await requestCtx.post(api('/sections'), {
      headers: bearer(adminSession.accessToken),
      data: {
        dayId: dayIds[1],
        name: 'Відділення дня 2',
        startTime: '09:30',
        entryIds: [pool[0].id],
      },
    });
    expect(day2.ok(), await day2.text()).toBeTruthy();

    const all = await fetchSections();
    const dayIdSet = new Set(all.map((s) => s.dayId));
    expect(dayIdSet.has(dayIds[0])).toBeTruthy();
    expect(dayIdSet.has(dayIds[1])).toBeTruthy();
    // ordered by day date: every day-1 section precedes every day-2 one
    const firstDay2 = all.findIndex((s) => s.dayId === dayIds[1]);
    const lastDay1 = all.map((s) => s.dayId).lastIndexOf(dayIds[0]);
    expect(firstDay2).toBeGreaterThan(lastDay1);
    expect(all.find((s) => s.dayId === dayIds[1])?.dayDate).toBe('2026-12-02');

    const onlyDay2 = await fetchSections(`?dayId=${dayIds[1]}`);
    expect(onlyDay2).toHaveLength(1);
    expect(onlyDay2[0].name).toBe('Відділення дня 2');
  });

  test('the section list pages by row without splitting a section', async () => {
    // Two sections in day 1; pageSize 1 forces one section per page.
    const p0 = await fetchJson<RowPaged<SectionView>>(
      `/sections?dayId=${dayIds[0]}&pageSize=1`,
    );
    expect(p0.totalSections).toBe(2);
    expect(p0.pageCount).toBe(2);
    expect(p0.page).toBe(0);
    expect(p0.rows).toHaveLength(1);
    expect(p0.rows[0].name).toBe('Відділення 1');
    expect([p0.rangeStart, p0.rangeEnd]).toEqual([1, 1]);
    // a section is never cut in half — its full running order comes through
    expect(p0.rows[0].items.some((i) => i.type === 'award')).toBeTruthy();

    const p1 = await fetchJson<RowPaged<SectionView>>(
      `/sections?dayId=${dayIds[0]}&pageSize=1&page=1`,
    );
    expect(p1.page).toBe(1);
    expect(p1.rows[0].name).toBe('Відділення 2');
    expect([p1.rangeStart, p1.rangeEnd]).toEqual([2, 2]);

    // an out-of-range page is clamped to the last one
    const clamped = await fetchJson<RowPaged<SectionView>>(
      `/sections?dayId=${dayIds[0]}&pageSize=1&page=99`,
    );
    expect(clamped.page).toBe(1);
    expect(clamped.rows[0].name).toBe('Відділення 2');
  });

  test('/sections/summary lists every section of the day, no items', async () => {
    const summary = await fetchJson<
      { id: string; name: string; sortOrder: number }[]
    >(`/sections/summary?dayId=${dayIds[0]}`);
    expect(summary.map((s) => s.name)).toEqual([
      'Відділення 1',
      'Відділення 2',
    ]);
    expect(summary[0]).not.toHaveProperty('items');
  });

  test('/sections/stats returns day-wide counters', async () => {
    const stats = await fetchJson<{
      performances: number;
      noMusic: number;
      endTime: string | null;
    }>(`/sections/stats?dayId=${dayIds[0]}`);
    // 2 sections x 2 performances each
    expect(stats.performances).toBe(4);
    expect(stats.noMusic).toBe(4); // fixture entries carry no music
    expect(stats.endTime).toMatch(/^\d\d:\d\d:\d\d$/);
  });

  test('the public program has times but no participant names', async () => {
    const res = await requestCtx.get(api('/program'));
    expect(res.status()).toBe(200);
    const body = (await res.json()) as RowPaged<{
      kind: string;
      label: string | null;
    }>;
    const rows = body.rows;

    expect(
      rows.some((r) => r.kind === 'section' && r.label === 'Відділення 1'),
    ).toBeTruthy();
    expect(rows.some((r) => r.kind === 'award')).toBeTruthy();

    const serialized = JSON.stringify(rows);
    for (const dancer of fixture.dancers) {
      expect(serialized).not.toContain(dancer.split(' ')[0]);
    }
    expect(serialized).not.toContain('E2E Студія');
  });

  test('the public program pages by section', async () => {
    // 3 sections total (2 in day 1, 1 in day 2); pageSize 1 → 3 pages.
    const p0 = (await (
      await requestCtx.get(api('/program?pageSize=1'))
    ).json()) as RowPaged<{ kind: string; label: string | null }>;
    expect(p0.totalSections).toBe(3);
    expect(p0.pageCount).toBe(3);
    expect(p0.rows.some((r) => r.kind === 'section')).toBeTruthy();

    const p2 = (await (
      await requestCtx.get(api('/program?pageSize=1&page=2'))
    ).json()) as RowPaged<{ kind: string; label: string | null }>;
    expect(p2.page).toBe(2);
    expect(
      p2.rows.some(
        (r) => r.kind === 'section' && r.label === 'Відділення дня 2',
      ),
    ).toBeTruthy();
  });

  test('a non-owner cannot build sections or change rules', async () => {
    const outsider = await registerParticipant(requestCtx);

    const noAuth = await requestCtx.post(api('/sections'), {
      data: { dayId: dayIds[0], name: 'x', startTime: '09:00', entryIds: [] },
    });
    expect(noAuth.status()).toBe(401);

    const build = await requestCtx.post(api('/sections'), {
      headers: bearer(outsider),
      data: {
        dayId: dayIds[0],
        name: 'x',
        startTime: '09:00',
        entryIds: [fixture.nominationId],
      },
    });
    expect(build.status()).toBe(403);

    const rules = await requestCtx.patch(api('/rules'), {
      headers: bearer(outsider),
      data: { pauseSeconds: 5 },
    });
    expect(rules.status()).toBe(403);

    const reorder = await requestCtx.post(api('/schedule/reorder-sections'), {
      headers: bearer(outsider),
      data: { dayId: dayIds[0], sectionIds: [dayIds[0]] },
    });
    expect(reorder.status()).toBe(403);
  });

  test('an invalid section start time is rejected', async () => {
    const res = await requestCtx.post(api('/sections'), {
      headers: bearer(adminSession.accessToken),
      data: {
        dayId: dayIds[0],
        name: 'Bad',
        startTime: '25:99',
        entryIds: [fixture.nominationId],
      },
    });
    expect(res.status()).toBe(400);
  });

  test('the owner sees the Таймінги and Програма tabs', async ({ page }) => {
    await seedBrowserSession(page, adminSession);
    await page.goto(`/competitions/${fixture.competitionId}`);

    await page.getByRole('tab', { name: 'Таймінги' }).click();
    await expect(
      page.getByText('Технічна пауза між виступами, сек'),
    ).toBeVisible();
    // league limits saved by the API test show up here
    await expect(page.getByText('Дебют')).toBeVisible();

    await page.getByRole('tab', { name: 'Програма' }).click();
    // Tech table: the section name is a cell, and dancer names are shown.
    await expect(
      page.getByText('Відділення 1', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Іваненко Марія')).toBeVisible();

    // Public projection: heading stays, dancer names are gone.
    await page.getByRole('button', { name: 'Публічна' }).click();
    await expect(
      page.getByRole('heading', { name: 'Відділення 1' }),
    ).toBeVisible();
    await expect(page.getByText('Іваненко')).toHaveCount(0);
  });
});
