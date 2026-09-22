import {
  test,
  expect,
  request as playwrightRequest,
  type BrowserContext,
  type Locator,
  type Page,
} from '@playwright/test';
import { SESSION_STORAGE_KEY } from '../../src/constants/storage.constants';
import { AdminApiClient, type Category, type Nomination } from './admin-api.client';
import {
  ADMIN_PASSWORD,
  ADMIN_PHONE,
  AGE_VETERANS,
  AGE_WITH_RANGE,
  BIG_TEMPLATE_MIN_NOMINATIONS,
  DEBUT_SECONDS,
  E2E_PREFIX,
  EXPRESS_DEFAULT_JSON_LIMIT_BYTES,
  FOREIGN_COMPETITION,
  LEAGUE_DEBUT,
  LEAGUE_PRO,
  LINEUP_DUO,
  MANUAL_SECONDS,
  MAX_SINGLE_LINE_INPUT_HEIGHT_PX,
  MIN_AGE_NAME_INPUT_WIDTH_PX,
  PRO_SECONDS,
  PRO_SECONDS_CHANGED,
  RENO_CLUB,
  SPECIAL_MODAL_VIEWPORTS,
  STYLE_DRIFT,
  VIEWPORT_HEIGHT,
} from './retest.constants';

/**
 * Re-test of BUG-01…TASK-14 from docs/bahy-ta-zadachi-v2.md on «Рено клуб».
 * Setup/cleanup goes through the API; every behavior under test is driven
 * and checked in the browser. Everything created here is removed in
 * afterAll and the competition is put back as it was (no venues, no
 * improvisation, no league timings, no E2E sections/entries/nominations).
 *
 * Run: E2E_ADMIN_PHONE=… E2E_ADMIN_PASSWORD=… npx playwright test tests/retest
 */

test.describe.configure({ mode: 'serial' });
test.skip(!ADMIN_PHONE || !ADMIN_PASSWORD, 'E2E_ADMIN_PHONE / E2E_ADMIN_PASSWORD not set');

const RUN = `${Date.now()}`;
const C = RENO_CLUB.ID;

let context: BrowserContext;
let page: Page;
let api: AdminApiClient;
let adminId: string;
let categories: Category[];

const created = {
  sectionIds: [] as string[],
  entryIds: [] as string[],
  nominationIds: [] as string[],
};

function categoryId(type: string, name: string): string {
  const found = categories.find((c) => c.type === type && c.name === name);
  if (!found) throw new Error(`No ${type} category «${name}»`);
  return found.id;
}

async function openTab(tab: string): Promise<void> {
  await page.goto(`/competitions/${C}`);
  await page.getByRole('tab', { name: tab, exact: true }).click();
}

async function nominationsOf(predicate: (n: Nomination) => boolean): Promise<Nomination[]> {
  return (await api.nominations(C)).filter(predicate);
}

function hasCategory(id: string) {
  return (n: Nomination) => n.categoryIds.includes(id);
}

async function saveLeagueTimings(values: Record<string, string>): Promise<void> {
  await openTab('Таймінги');
  for (const [league, value] of Object.entries(values)) {
    await page
      .locator(`xpath=//span[normalize-space()='${league}']/following-sibling::input`)
      .fill(value);
  }
  const saved = page.waitForResponse(
    (r) => r.url().endsWith(`/competitions/${C}/rules`) && r.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Зберегти', exact: true }).click();
  expect((await saved).ok()).toBeTruthy();
}

async function nominationRow(name: string): Promise<Locator> {
  await page.getByLabel('Пошук номінацій за назвою').fill(name);
  const row = page.locator('li', { has: page.getByLabel(`Тривалість номінації ${name}`) });
  await expect(row).toHaveCount(1);
  return row;
}

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
  await page.goto('/login');
  await page.locator('#loginId').fill(ADMIN_PHONE);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Увійти' }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'));

  const session = await page.evaluate(
    (key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'),
    SESSION_STORAGE_KEY,
  );
  expect(session?.profile?.accessLevel).toBe('ADMIN');
  adminId = session.profile.id;
  api = new AdminApiClient(await playwrightRequest.newContext(), session.accessToken);
  categories = await api.categories();
});

test.afterAll(async () => {
  if (!api) return;
  for (const id of created.sectionIds) {
    await api.deleteIfExists(`/competitions/${C}/sections/${id}`);
  }
  for (const id of created.entryIds) {
    await api.deleteIfExists(`/competitions/${C}/entries/${id}`);
  }
  for (const id of created.nominationIds) {
    await api.deleteIfExists(`/competitions/${C}/nominations/${id}`);
  }
  await api.send('PATCH', `/competitions/${C}/nominations/bulk-venue`, {
    filter: {},
    venueId: null,
  });
  await api.send('PATCH', `/competitions/${C}/nominations/bulk-improvisation`, {
    filter: {},
    allowsImprovisation: false,
  });
  await api.setLeagueLimits(C, {});
  await context?.close();
});

test('BUG-01 — admin edits a competition they do not own', async () => {
  const foreign = await api.get<{ ownerId: string }>(`/competitions/${FOREIGN_COMPETITION.ID}`);
  expect(foreign.ownerId).not.toBe(adminId);

  await page.goto(`/competitions/${FOREIGN_COMPETITION.ID}`);
  await page.getByRole('link', { name: 'Редагувати' }).click();
  await expect(page).toHaveURL(new RegExp(`/competitions/${FOREIGN_COMPETITION.ID}/edit$`));
  await expect(page.locator(`input[value="${FOREIGN_COMPETITION.NAME}"]`)).toBeVisible();
});

test('BUG-02 — a template with 1000+ nominations saves', async () => {
  const axis = (type: string) => categories.filter((c) => c.type === type);
  const combos = ['lineup', 'age', 'level', 'style']
    .map(axis)
    .reduce<Category[][]>((acc, values) => acc.flatMap((combo) => values.map((v) => [...combo, v])), [[]]);
  const nominations = combos.map((combo) => ({
    name: combo.map((c) => c.name).join(' · '),
    categoryIds: combo.map((c) => c.id),
  }));
  const payload = { name: `${E2E_PREFIX} BUG-02 ${RUN}`, nominations };
  expect(nominations.length).toBeGreaterThanOrEqual(BIG_TEMPLATE_MIN_NOMINATIONS);
  expect(JSON.stringify(payload).length).toBeGreaterThan(EXPRESS_DEFAULT_JSON_LIMIT_BYTES);

  const startedAt = Date.now();
  const res = await api.rawPost('/category-templates', payload);
  const elapsedMs = Date.now() - startedAt;
  const body = await res.json();
  try {
    expect(res.status(), JSON.stringify(body)).toBe(201);
    test.info().annotations.push({
      type: 'BUG-02',
      description: `${nominations.length} nominations, ${JSON.stringify(payload).length} bytes, saved in ${elapsedMs} ms`,
    });
  } finally {
    if (body?.id) await api.deleteIfExists(`/category-templates/${body.id}`);
  }
});

test.describe('Category builder (template form, nothing saved)', () => {
  const axisInput = (label: string) => page.getByLabel(`Значення категорії «${label}»`);

  async function addAxisValue(label: string, name: string, range?: { from: string; to: string }) {
    await axisInput(label).fill(name);
    if (range) {
      await page.getByLabel('Вік від').fill(range.from);
      await page.getByLabel('Вік до').fill(range.to);
    }
    await axisInput(label).locator('xpath=..').getByRole('button', { name: 'Додати значення' }).click();
  }

  test('BUG-03 — a custom age range is kept; a clash with the dictionary is reported', async () => {
    await page.goto('/category-templates/new');
    const ageName = `${E2E_PREFIX} вік ${RUN}`;

    await addAxisValue('Вік', ageName, { from: '22', to: '28' });
    await expect(page.getByText(`${ageName} (22–28)`)).toBeVisible();

    await addAxisValue('Вік', AGE_WITH_RANGE.NAME, { from: '22', to: '28' });
    await expect(
      page.getByText(`уже існує з межами ${AGE_WITH_RANGE.FROM}–${AGE_WITH_RANGE.TO}`),
    ).toBeVisible();

    // Not used by any nomination yet — removed without a question.
    await page.getByRole('button', { name: `Прибрати ${ageName}`, exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByText(`${ageName} (22–28)`)).toHaveCount(0);
    await axisInput('Вік').fill('');
    await page.getByLabel('Вік від').fill('');
    await page.getByLabel('Вік до').fill('');
  });

  test('BUG-05 / BUG-09 — removing a used value asks: keep or drop its nominations', async () => {
    await addAxisValue('Склад', LINEUP_DUO);
    await addAxisValue('Ліга', LEAGUE_PRO);
    await addAxisValue('Стиль', STYLE_DRIFT);
    await addAxisValue('Вік', AGE_VETERANS);
    await addAxisValue('Вік', 'Мастер');
    await page.getByRole('button', { name: 'Згенерувати номінації' }).click();
    await expect(page.getByText('Номінації (2)')).toBeVisible();

    // «Лише прибрати з вибору» — generated nominations survive (BUG-05).
    await page.getByRole('button', { name: 'Прибрати Мастер', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Прибрати значення категорії?' });
    await expect(dialog).toContainText('використано в номінаціях: 1');
    await dialog.getByRole('button', { name: 'Лише прибрати з вибору' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Прибрати Мастер', exact: true })).toHaveCount(0);
    await expect(page.getByText('Номінації (2)')).toBeVisible();

    // A second batch merges into the first one.
    await addAxisValue('Вік', 'Дорослі');
    await page.getByRole('button', { name: 'Згенерувати номінації' }).click();
    await expect(page.getByText('Номінації (3)')).toBeVisible();
    await expect(page.getByText(/Додано 1, пропущено дублікатів 1, усього 3/)).toBeVisible();

    // «Скасувати» changes nothing.
    await page.getByRole('button', { name: 'Прибрати Дорослі', exact: true }).click();
    await dialog.getByRole('button', { name: 'Скасувати' }).click();
    await expect(page.getByRole('button', { name: 'Прибрати Дорослі', exact: true })).toBeVisible();
    await expect(page.getByText('Номінації (3)')).toBeVisible();

    // «Видалити разом із номінаціями» — the value leaves the payload (BUG-09).
    await page.getByRole('button', { name: 'Прибрати Дорослі', exact: true }).click();
    await dialog.getByRole('button', { name: 'Видалити разом із номінаціями' }).click();
    await expect(page.getByText('Номінації (2)')).toBeVisible();
    await expect(page.getByRole('cell').getByRole('textbox', { name: 'Назва номінації' })).toHaveCount(2);
    for (const input of await page.getByRole('textbox', { name: 'Назва номінації' }).all()) {
      await expect(input).not.toHaveValue(/Дорослі/);
    }
  });
});

test('BUG-06 — special-category modal shows full age names at every width', async () => {
  await openTab('Номінації');
  await page.getByRole('button', { name: '+ Додати спеціальну категорію' }).click();
  const dialog = page.getByRole('dialog', { name: 'Спеціальна категорія' });
  await expect(dialog).toBeVisible();
  const ageInput = dialog.getByLabel('Значення «Вік»');
  const title = dialog.getByRole('heading', { name: 'Спеціальна категорія' });

  for (const width of SPECIAL_MODAL_VIEWPORTS) {
    await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });
    await ageInput.scrollIntoViewIfNeeded();
    const inputBox = await ageInput.boundingBox();
    expect(inputBox!.width, `age input at ${width}px`).toBeGreaterThanOrEqual(MIN_AGE_NAME_INPUT_WIDTH_PX);
    for (const field of [ageInput, dialog.getByLabel('Вік від'), dialog.getByLabel('Вік до')]) {
      const box = await field.boundingBox();
      expect.soft(box!.height, `field height at ${width}px`).toBeLessThanOrEqual(MAX_SINGLE_LINE_INPUT_HEIGHT_PX);
    }
    // The body scrolls, the header stays put and visible.
    const titleBox = await title.boundingBox();
    expect(titleBox!.y, `title at ${width}px`).toBeGreaterThanOrEqual(0);
    await expect(title).toBeInViewport();
    await page.screenshot({ path: test.info().outputPath(`bug-06-${width}px.png`) });
  }
  await page.setViewportSize({ width: 1280, height: VIEWPORT_HEIGHT });
  await page.keyboard.press('Escape');
});

test.describe('Durations (TASK-07, BUG-10, manual override)', () => {
  const tempName = `${E2E_PREFIX} тривалість ${RUN}`;
  let tempId: string;

  test('TASK-07 — league timing fills durations; a new nomination takes its league\'s', async () => {
    await saveLeagueTimings({ [LEAGUE_PRO]: '2:00', [LEAGUE_DEBUT]: '1:30' });

    const pro = await nominationsOf(hasCategory(categoryId('level', LEAGUE_PRO)));
    const debut = await nominationsOf(hasCategory(categoryId('level', LEAGUE_DEBUT)));
    expect(pro.length).toBeGreaterThan(0);
    expect(pro.every((n) => n.durationLimitSeconds === PRO_SECONDS)).toBeTruthy();
    expect(debut.every((n) => n.durationLimitSeconds === DEBUT_SECONDS)).toBeTruthy();

    const temp = await api.send<Nomination>('POST', `/competitions/${C}/nominations`, {
      name: tempName,
      categoryIds: [
        categoryId('lineup', LINEUP_DUO),
        categoryId('age', AGE_VETERANS),
        categoryId('level', LEAGUE_PRO),
      ],
    });
    tempId = temp.id;
    created.nominationIds.push(tempId);
    expect(temp.durationLimitSeconds).toBe(PRO_SECONDS);
    expect(temp.durationOverridden).toBe(false);

    await openTab('Номінації');
    const row = await nominationRow(tempName);
    await expect(row.getByLabel(`Тривалість номінації ${tempName}`)).toHaveValue('2:00');
  });

  test('fix #3 — saving only the price does not pin the duration', async () => {
    const row = await nominationRow(tempName);
    await row.getByLabel(`Ціна номінації ${tempName}`).fill('500');
    await row.getByRole('button', { name: 'Зберегти' }).click();
    await expect(row.getByRole('button', { name: 'Зберегти' })).toBeDisabled();
    await expect(row.getByText('тривалість вручну')).toHaveCount(0);

    const temp = (await nominationsOf((n) => n.id === tempId))[0];
    expect(temp.durationOverridden).toBe(false);
  });

  test('BUG-10 — changing a league timing updates its nominations', async () => {
    await saveLeagueTimings({ [LEAGUE_PRO]: '1:40' });
    const pro = await nominationsOf(hasCategory(categoryId('level', LEAGUE_PRO)));
    expect(pro.every((n) => n.durationLimitSeconds === PRO_SECONDS_CHANGED)).toBeTruthy();

    await openTab('Номінації');
    const row = await nominationRow(tempName);
    await expect(row.getByLabel(`Тривалість номінації ${tempName}`)).toHaveValue('1:40');
  });

  test('manual duration survives a league change', async () => {
    const row = await nominationRow(tempName);
    await row.getByLabel(`Тривалість номінації ${tempName}`).fill('3:00');
    await row.getByRole('button', { name: 'Зберегти' }).click();
    await expect(row.getByText('тривалість вручну')).toBeVisible();

    await saveLeagueTimings({ [LEAGUE_PRO]: '2:00' });
    const temp = (await nominationsOf((n) => n.id === tempId))[0];
    expect(temp.durationOverridden).toBe(true);
    expect(temp.durationLimitSeconds).toBe(MANUAL_SECONDS);
    const otherPro = await nominationsOf(
      (n) => n.id !== tempId && hasCategory(categoryId('level', LEAGUE_PRO))(n),
    );
    expect(otherPro.every((n) => n.durationLimitSeconds === PRO_SECONDS)).toBeTruthy();
  });
});

test('TASK-04 + fix #4 — bulk improvisation by filter, duration follows', async () => {
  const isDrift = (n: Nomination) => n.name.includes(STYLE_DRIFT);
  const proId = categoryId('level', LEAGUE_PRO);

  await openTab('Номінації');
  await page.getByLabel('Пошук номінацій за назвою').fill(STYLE_DRIFT);
  const drift = await nominationsOf(isDrift);
  await page.getByLabel(`Обрати всі відфільтровані (${drift.length})`).check();
  await page.getByRole('button', { name: 'Встановити «Імпровізація»' }).click();
  await expect.poll(async () => (await nominationsOf(isDrift)).every((n) => n.allowsImprovisation)).toBe(true);
  expect((await nominationsOf(isDrift)).every((n) => n.durationLimitSeconds === null)).toBeTruthy();
  const others = await nominationsOf((n) => !isDrift(n) && n.id !== created.nominationIds[0]);
  expect(others.every((n) => !n.allowsImprovisation)).toBeTruthy();

  await page.reload();
  await page.getByRole('tab', { name: 'Номінації', exact: true }).click();
  await page.getByLabel('Пошук номінацій за назвою').fill(STYLE_DRIFT);
  await expect(page.getByText('імпровізація', { exact: true }).first()).toBeVisible();

  await page.getByLabel(`Обрати всі відфільтровані (${drift.length})`).check();
  await page.getByRole('button', { name: 'Зняти «Імпровізація»' }).click();
  await expect.poll(async () => (await nominationsOf(isDrift)).every((n) => !n.allowsImprovisation)).toBe(true);
  const back = await nominationsOf(isDrift);
  expect(back.filter(hasCategory(proId)).every((n) => n.durationLimitSeconds === PRO_SECONDS)).toBeTruthy();
});

test('TASK-08 — filter + select all filtered + bulk venue', async () => {
  const proId = categoryId('level', LEAGUE_PRO);
  const vetId = categoryId('age', AGE_VETERANS);
  const target = (n: Nomination) => n.categoryIds.includes(proId) && n.categoryIds.includes(vetId);

  await openTab('Майданчики');
  await page.getByLabel('Фільтр за лігою').selectOption({ label: LEAGUE_PRO });
  await page.getByLabel('Фільтр за віком').selectOption({ label: AGE_VETERANS });
  const expected = await nominationsOf(target);
  await page.getByLabel(`Обрати всі відфільтровані (${expected.length})`).check();
  await page.getByLabel('Майданчик для обраних номінацій').selectOption(RENO_CLUB.VENUE_A);
  await page.getByRole('button', { name: 'Призначити на майданчик' }).click();

  await expect
    .poll(async () => (await nominationsOf(target)).every((n) => n.venueId === RENO_CLUB.VENUE_A))
    .toBe(true);
  expect((await nominationsOf((n) => !target(n))).every((n) => n.venueId === null)).toBeTruthy();

  await page.reload();
  await page.getByRole('tab', { name: 'Майданчики', exact: true }).click();
  const one = expected[0];
  await expect(page.getByLabel(`Майданчик номінації ${one.name}`).first()).toHaveValue(RENO_CLUB.VENUE_A);
});

test.describe('Program (BUG-11, BUG-12, BUG-19, BUG-13, TASK-14, fix #2)', () => {
  const sectionA = `${E2E_PREFIX} А ${RUN}`;
  const sectionB = `${E2E_PREFIX} И ${RUN}`;
  let sectionAId: string;
  let sectionBId: string;

  async function openDay2(venue: string): Promise<void> {
    await openTab('Програма');
    await page.getByRole('button', { name: RENO_CLUB.DAY_2_LABEL, exact: true }).click();
    await page.getByRole('button', { name: venue, exact: true }).click();
  }

  async function performances(venueId?: string): Promise<number> {
    const query = `dayId=${RENO_CLUB.DAY_2_ID}${venueId ? `&venueId=${venueId}` : ''}&pageSize=100`;
    const pageRows = await api.get<{ rows: { items: { type: string }[] }[] }>(
      `/competitions/${C}/sections?${query}`,
    );
    return pageRows.rows.flatMap((s) => s.items).filter((i) => i.type === 'performance').length;
  }

  test.beforeAll(async () => {
    await api.send('PATCH', `/competitions/${C}/nominations/${RENO_CLUB.NOMINATION_A}`, {
      venueId: RENO_CLUB.VENUE_A,
    });
    await api.send('PATCH', `/competitions/${C}/nominations/${RENO_CLUB.NOMINATION_B}`, {
      venueId: RENO_CLUB.VENUE_B,
    });
    for (const [name, entryId] of [
      [sectionA, RENO_CLUB.ENTRY_A],
      [sectionB, RENO_CLUB.ENTRY_B],
    ]) {
      const section = await api.send<{ id: string }>('POST', `/competitions/${C}/sections`, {
        dayId: RENO_CLUB.DAY_2_ID,
        name,
        startTime: '10:00',
        entryIds: [entryId],
      });
      created.sectionIds.push(section.id);
    }
    [sectionAId, sectionBId] = created.sectionIds;
  });

  test('BUG-12 / BUG-19 — each venue shows only its own sections; А + И = Усі', async () => {
    await openDay2('Усі');
    await expect(page.getByText(sectionA)).toBeVisible();
    await expect(page.getByText(sectionB)).toBeVisible();
    await expect(page.getByText(new RegExp(`· ${RENO_CLUB.VENUE_A_NAME}$`))).toBeVisible();
    await expect(page.getByText(new RegExp(`· ${RENO_CLUB.VENUE_B_NAME}$`))).toBeVisible();

    await page.getByRole('button', { name: RENO_CLUB.VENUE_A_NAME, exact: true }).click();
    await expect(page.getByText(sectionA)).toBeVisible();
    await expect(page.getByText(sectionB)).toHaveCount(0);

    await page.getByRole('button', { name: RENO_CLUB.VENUE_B_NAME, exact: true }).click();
    await expect(page.getByText(sectionB)).toBeVisible();
    await expect(page.getByText(sectionA)).toHaveCount(0);

    const all = await performances();
    const a = await performances(RENO_CLUB.VENUE_A);
    const b = await performances(RENO_CLUB.VENUE_B);
    expect(a + b).toBe(all);
  });

  test('BUG-11 — Технічна → Публічна → Технічна keeps the program', async () => {
    await openDay2('Усі');
    await page.getByRole('button', { name: 'Публічна', exact: true }).click();
    await page.getByRole('button', { name: 'Технічна', exact: true }).click();
    await expect(page.getByText(sectionA)).toBeVisible();
    await expect(page.getByText(sectionB)).toBeVisible();
    await page.getByRole('button', { name: 'Редагувати', exact: true }).click();
    await expect(page.getByText(sectionA)).toBeVisible();
    await expect(page.getByText(sectionB)).toBeVisible();
  });

  test('BUG-13 — a late entry joins its nomination block', async () => {
    const entries = await api.send<{ id: string; routineName: string }[]>(
      'POST',
      `/competitions/${C}/entries`,
      { nominationId: RENO_CLUB.NOMINATION_A, participantIds: RENO_CLUB.LATE_DUO },
    );
    const late = Array.isArray(entries) ? entries[0] : (entries as { id: string; routineName: string });
    created.entryIds.push(late.id);

    const a = (await api.sections(C)).find((s) => s.id === sectionAId)!;
    const exits = a.items.filter((i) => i.type === 'performance').map((i) => i.exit?.entryId);
    expect(exits).toEqual([RENO_CLUB.ENTRY_A, late.id]);

    await openDay2(RENO_CLUB.VENUE_A_NAME);
    await expect(page.getByText(late.routineName).first()).toBeVisible();
  });

  test('TASK-14 — move a nomination to the other venue\'s section', async () => {
    await openDay2(RENO_CLUB.VENUE_B_NAME);
    await page.getByRole('button', { name: 'Редагувати', exact: true }).click();
    await page.getByTitle('Перенести номінацію').click();
    const dialog = page.getByRole('dialog', { name: 'Перенести номінацію' });
    await dialog.locator('#pickSectionTarget').selectOption({ label: sectionA });
    await dialog.getByRole('button', { name: 'Перенести', exact: true }).click();
    await expect(dialog).toHaveCount(0);

    const moved = (await nominationsOf((n) => n.id === RENO_CLUB.NOMINATION_B))[0];
    expect(moved.venueId).toBe(RENO_CLUB.VENUE_A);
    const sections = await api.sections(C);
    const a = sections.find((s) => s.id === sectionAId)!;
    const b = sections.find((s) => s.id === sectionBId);
    expect(a.items.filter((i) => i.type === 'performance')).toHaveLength(3);
    expect((b?.items ?? []).filter((i) => i.type === 'performance')).toHaveLength(0);

    await openDay2(RENO_CLUB.VENUE_A_NAME);
    await expect(page.getByText(sectionA)).toBeVisible();
    await expect(page.getByText(RENO_CLUB.NOMINATION_B_NAME).first()).toBeVisible();
  });

  test('fix #2 — the program uses a nomination\'s manual duration', async () => {
    const tempId = created.nominationIds[0];
    test.skip(!tempId, 'needs the manual-duration nomination from the durations block');
    const entries = await api.send<{ id: string }[] | { id: string }>(
      'POST',
      `/competitions/${C}/entries`,
      { nominationId: tempId, participantIds: RENO_CLUB.LATE_DUO },
    );
    const entry = Array.isArray(entries) ? entries[0] : entries;
    created.entryIds.push(entry.id);
    const section = await api.send<{ id: string; items: { type: string; durationSeconds: number }[] }>(
      'POST',
      `/competitions/${C}/sections`,
      { dayId: RENO_CLUB.DAY_2_ID, name: `${E2E_PREFIX} ручна ${RUN}`, startTime: '12:00', entryIds: [entry.id] },
    );
    created.sectionIds.push(section.id);
    const perf = section.items.filter((i) => i.type === 'performance');
    expect(perf.map((i) => i.durationSeconds)).toEqual([MANUAL_SECONDS]);

    await openDay2('Усі');
    await expect(page.getByText(`${E2E_PREFIX} ручна ${RUN}`)).toBeVisible();
    await expect(page.getByText('3:00').first()).toBeVisible();
  });
});
