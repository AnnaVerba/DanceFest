# Нагородна продукція + «Цифри конкурсу» — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Once the festival program is built, the organizer and admin see how many place medals, participation medals, cups and diplomas to buy, plus the counts for each special nomination. They can switch to «медальний залік» and correct any number by hand. The public competition page gets a «Цифри конкурсу» block.

**Architecture:** A new backend `awards/` module:
- A pure calculator `calculateAwards` works on plain `AwardPerformance` objects.
- `AwardsService` builds those objects from the entries placed in the program (`ScheduleService.assignedEntryIds`), the competition's nominations, their templates and categories.
- The module owns its own `award_settings` table: the award system and manual overrides per report line.
- The «медаль кожному» leagues are a new `allMedalLeagues` list on `category_templates`.

Special nominations reuse the existing data: a special competition nomination is matched to its template special category by `templateId` + `categoryIds`, and the bare name comes from `template_nominations.specialName`. There is no new column on `nominations`.

On the frontend, an `AwardsSummary` block with editable lines sits above the program on `SchedulePage`. The template form gets a league checkbox list. The public page gets `CompetitionFacts`, backed by a public `GET entries/stats`.

**Tech Stack:** NestJS 11, `sequelize-typescript`, `sequelize-cli` migrations/seeders (TS via ts-node), Postgres, `class-validator`, React 19 + Vite + React Router 7, CSS modules.

**Spec:** No separate spec doc. The source is the Developer's request of 2026-09-14 plus the follow-up answers, restated in **Domain rules** below. Executors read that section first.

## Domain rules

A **category** is one competition nomination: entries share `entry.nominationId ?? entry.nomination`, the same key the schedule uses in `ScheduleService.groupByNomination`. Only **entries placed in the program** (section items of type `performance`) are counted.

1. **Individual performances (соло, дует, тріо), leagues «медаль кожному» (Дебют, Перші кроки).** Every performance in the category gets a place medal. Medals are split across places 1–3 as evenly as possible, with the surplus going to the better places:
   - 3 → 1/1/1, 4 → 2/1/1, 5 → 2/2/1, 14 → 5/5/4.
   - Formula: for place i (of 3), `count = ceil(remaining / placesLeft)`.
2. **Individual performances, every other league.** Only places 1/2/3 get a medal (1/1/1, or fewer if the category is smaller). Everyone else gets only a diploma.
3. **Duets and trios.** Every member of a medal-winning performance gets a medal, so medals = performances at that place × members.
4. **Group performances (4+ dancers, `entry.lineup === 'Група'`).** Each one gets **one cup**, whatever its place. Cups are broken down by the nomination's lineup category name (Група / Формейшн / Продакшн), falling back to «Група». Every member gets a **participation medal**.
5. **Diplomas** = sum of dancers over all participations. Example: groups of 8 + 13 + 23 → 44.
6. **Special nominations** (existing `nomination.isSpecial`, created via `SpecialCategoryModal`) are counted separately per bare special name. For each one: **winners** = number of its categories and **participations** = number of performances. Example: «Корона» × 4 categories × 6 performances → winners 4, participations 24. They add nothing to rules 1–5.
7. **«Медальний залік».** When switched on, rule 1 applies to **every** category except groups and specials.
8. **«Медаль кожному» leagues** are configured **in the category template** (`allMedalLeagues`, by league name). A seeded public template marks «Дебют» and «Перші кроки».
9. **Manual correction.** The organizer (owner or a team member) and the global admin can override **any** report line with their own number, and reset it back to the calculated value. The calculated value stays visible next to the override.
10. The awards block sits **above the festival program** and is visible only to those same people.

Interpretation decisions (flag to the Developer if wrong):
- A nomination danced `per_program` creates several entries for the same dancers in one category. They count as **one** participation (deduplicated by the sorted `participantIds`).
- If one category mixes sizes, the medals per place use the largest size.
- Special-nomination performances are **not** included in the general diploma count.
- Getting the special name from the template only works for nominations generated from a template. A special created in «Номінації» on the competition page without a template, or a template nomination whose categories were changed afterwards, is counted under its full name, `nomination.name`.
- An override for a line that disappears from the report (e.g. a cup type no longer in the program) is kept in storage but not shown.

## Global Constraints

From `CLAUDE.md` (Developer's instructions):

- Classes, types and constants live in **separate files** (`*.constants.ts`, `*.interface.ts`, `*.types.ts`).
- **No magic numbers or strings.** Use named constants, including Ukrainian UI copy in new components.
- **Don't pass functions as parameters** to our own APIs. Use classes/interfaces (NestJS DI, `AwardPerformanceResolver`). React event props follow the existing component idiom.
- **Do not write tests.** Verification is `tsc` + lint + the manual checks in each task.
- **Do not commit.** Each task ends verified and uncommitted.
- SOLID / clean code. **Reuse** existing code: `ScheduleService.assignedEntryIds`, `EntriesService.loadCompetitionAndAssertAccess`, `CategoriesService.findByIds`, `template_nominations.specialName`, `LINEUP_LABELS`, `apiRequest`/`publicRequest`, `ApiError`, `getStoredAdmin`.
- Surgical changes: touch only the lines listed. `competition_rules` and `nominations` are **not** changed.
- Migrations and seeders sort after `20260909120000-add-gin-index-to-entries-participant-ids.ts`.
- Backend verify: `cd backend && npx tsc --noEmit && npm run lint`
- Frontend verify: `cd frontend && npm run build && npm run lint`
- User-facing copy in Ukrainian.

---

## File Structure

### Backend — created

| File | Responsibility |
|---|---|
| `backend/migrations/20260914090000-create-award-settings.ts` | `award_settings` table |
| `backend/migrations/20260914090100-add-all-medal-leagues-to-category-templates.ts` | `category_templates.allMedalLeagues` |
| `backend/seeders/20260914090000-all-medal-leagues-template.ts` | public template «Дебют і Перші кроки — медаль кожному» |
| `backend/src/category-templates/normalize-league-names.ts` | trim / dedupe league names |
| `backend/src/awards/award-system.ts` | `AWARD_SYSTEMS`, `AwardSystem`, defaults |
| `backend/src/awards/award-line-kind.ts` | `AWARD_LINE_KINDS`, `AwardLineKind`, per-kind constants |
| `backend/src/awards/awards.constants.ts` | numeric/key constants, messages |
| `backend/src/awards/award-settings.model.ts` | `AwardSettings` model |
| `backend/src/awards/award-performance.interface.ts` | `AwardPerformance` |
| `backend/src/awards/awards-input.interface.ts` | `AwardsInput` |
| `backend/src/awards/awards-calculation.interface.ts` | `AwardsCalculation`, `PlaceMedals`, `CupCount`, `SpecialAwardSummary` |
| `backend/src/awards/award-line.interface.ts` | `AwardLine` |
| `backend/src/awards/awards-report.interface.ts` | `AwardsReport` |
| `backend/src/awards/medal-distribution.ts` | `distributeAllPlaces`, `distributeTopPlaces` |
| `backend/src/awards/calculate-awards.ts` | `calculateAwards(input): AwardsCalculation` |
| `backend/src/awards/build-award-lines.ts` | `buildAwardLines(calculation, overrides): AwardLine[]` |
| `backend/src/awards/special-name-key.ts` | `specialNameKey(templateId, categoryIds)` |
| `backend/src/awards/award-performance-resolver.ts` | `AwardPerformanceResolver` — Entry → AwardPerformance |
| `backend/src/awards/dto/update-award-system.dto.ts` | `UpdateAwardSystemDto` |
| `backend/src/awards/dto/update-award-override.dto.ts` | `UpdateAwardOverrideDto` |
| `backend/src/awards/awards.service.ts` | data loading, access, report / system / override |
| `backend/src/awards/awards.controller.ts` | `GET /awards`, `PATCH /awards/system`, `PATCH /awards/overrides` |
| `backend/src/awards/awards.module.ts` | wiring |
| `backend/src/entries/entry-stats.interface.ts` | `EntryStats`, `LineupCount` |
| `backend/src/entries/build-entry-stats.ts` | `buildEntryStats(entries)` |

### Backend — modified

| File | Change |
|---|---|
| `backend/src/category-templates/category-template.model.ts` | `allMedalLeagues` column |
| `backend/src/category-templates/dto/create-category-template.dto.ts` | `allMedalLeagues?` |
| `backend/src/category-templates/category-templates.service.ts` | create / update / fork / toDto |
| `backend/src/schedule/schedule.service.ts` | `assignedEntryIds` becomes public |
| `backend/src/schedule/schedule.module.ts` | `exports: [ScheduleService]` |
| `backend/src/entries/entries.service.ts` | `loadCompetitionAndAssertAccess` becomes public; new `stats()` |
| `backend/src/entries/entries.constants.ts` | `MIN_PARTICIPANTS_PER_ENTRY`, `MAX_ENTRY_STATS_ROWS`, `ENTRY_STATS_ATTRIBUTES` |
| `backend/src/entries/entries.controller.ts` | public `GET stats` |
| `backend/src/app.module.ts` | register `AwardsModule` |

### Frontend — created

| File | Responsibility |
|---|---|
| `frontend/src/lib/awards.constants.ts` | `AWARD_SYSTEM`, `AWARD_LINE_KIND`, `SPECIAL_LINE_KINDS`, `MIN_AWARD_QUANTITY`, `HTTP_FORBIDDEN` |
| `frontend/src/lib/awards.types.ts` | `AwardSystem`, `AwardLineKind`, `AwardLine`, `AwardsReport` |
| `frontend/src/lib/awards.ts` | `getAwardsReport`, `setAwardSystem`, `setAwardOverride` |
| `frontend/src/components/awards/AwardsSummary.tsx` | staff-only block above the program |
| `frontend/src/components/awards/AwardLineRow.tsx` | one editable line |
| `frontend/src/components/awards/AwardsSummary.constants.ts` | copy |
| `frontend/src/components/awards/AwardsSummary.module.css` | styles (shared by both components) |
| `frontend/src/components/nominations/AllMedalLeaguesField.tsx` | league checkboxes in the template form |
| `frontend/src/components/nominations/AllMedalLeaguesField.constants.ts` | copy |
| `frontend/src/components/nominations/AllMedalLeaguesField.module.css` | styles |
| `frontend/src/lib/entryStats.types.ts` | `EntryStats`, `LineupCount` |
| `frontend/src/components/CompetitionFacts.tsx` | «Цифри конкурсу» |
| `frontend/src/components/CompetitionFacts.constants.ts` | copy |
| `frontend/src/components/CompetitionFacts.module.css` | styles |

### Frontend — modified

| File | Change |
|---|---|
| `frontend/src/lib/categories.ts` | `LEAGUE_CATEGORY_TYPE` |
| `frontend/src/lib/categoryTemplates.ts` | `allMedalLeagues` on `CategoryTemplate` / `CategoryTemplateInput` |
| `frontend/src/pages/CategoryTemplateFormPage.tsx` | load/save `allMedalLeagues`, render `AllMedalLeaguesField` |
| `frontend/src/pages/SchedulePage.tsx` | render `AwardsSummary` for staff |
| `frontend/src/lib/entries.ts` | `getEntryStats` |
| `frontend/src/pages/PublicCompetitionPage.tsx` | load stats, render `CompetitionFacts` |

---

### Task 1: `award_settings` storage

**Files:**
- Create: `backend/migrations/20260914090000-create-award-settings.ts`
- Create: `backend/src/awards/award-system.ts`
- Create: `backend/src/awards/award-settings.model.ts`

**Interfaces:**
- Produces: `AWARD_SYSTEMS`, `type AwardSystem = 'standard' | 'medal_standings'`, `STANDARD_AWARD_SYSTEM`, `MEDAL_STANDINGS_AWARD_SYSTEM`; model `AwardSettings { id; competitionId; awardSystem: AwardSystem; overrides: Record<string, number> }` (one row per competition).

- [ ] **Step 1: Create the migration**

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'award_settings';
const ENUM_TYPE = 'enum_award_settings_awardSystem';
const AWARD_SYSTEMS = ['standard', 'medal_standings'];
const DEFAULT_AWARD_SYSTEM = 'standard';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      competitionId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'competitions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      awardSystem: {
        type: DataTypes.ENUM(...AWARD_SYSTEMS),
        allowNull: false,
        defaultValue: DEFAULT_AWARD_SYSTEM,
      },
      overrides: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_TYPE}";`);
  },
};
```

- [ ] **Step 2: Create `award-system.ts`**

```ts
// How place medals are counted for individual performances (соло, дует,
// тріо). standard — only leagues a template marks «медаль кожному» spread
// medals over the whole category, the rest award places 1–3 only.
// medal_standings — «медальний залік»: every category spreads medals.
export const AWARD_SYSTEMS = ['standard', 'medal_standings'] as const;
export type AwardSystem = (typeof AWARD_SYSTEMS)[number];

export const STANDARD_AWARD_SYSTEM: AwardSystem = 'standard';
export const MEDAL_STANDINGS_AWARD_SYSTEM: AwardSystem = 'medal_standings';
```

- [ ] **Step 3: Create `award-settings.model.ts`**

```ts
import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { AWARD_SYSTEMS, STANDARD_AWARD_SYSTEM } from './award-system';
import type { AwardSystem } from './award-system';

@Table({ tableName: 'award_settings' })
export class AwardSettings extends Model<AwardSettings> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  declare competitionId: string;

  @Column({
    type: DataType.ENUM(...AWARD_SYSTEMS),
    allowNull: false,
    defaultValue: STANDARD_AWARD_SYSTEM,
  })
  declare awardSystem: AwardSystem;

  // Organizer's hand-typed quantities, keyed by AwardLine.key. A key absent
  // here means "use the calculated value".
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare overrides: Record<string, number>;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
```

- [ ] **Step 4: Verify**

Run: `cd backend && npm run migrate && npm run migrate:undo && npm run migrate`
Expected: all three succeed.
Run: `cd backend && npx tsc --noEmit && npm run lint`
Expected: clean. The model isn't registered yet; it gets wired in Task 5.

- [ ] **Step 5: Stop — do not commit.**

---

### Task 2: «Медаль кожному» leagues on category templates (backend)

**Files:**
- Create: `backend/migrations/20260914090100-add-all-medal-leagues-to-category-templates.ts`
- Create: `backend/src/category-templates/normalize-league-names.ts`
- Modify: `backend/src/category-templates/category-template.model.ts`
- Modify: `backend/src/category-templates/dto/create-category-template.dto.ts`
- Modify: `backend/src/category-templates/category-templates.service.ts`

**Interfaces:**
- Produces: `CategoryTemplate.allMedalLeagues: string[]` (league names as on `entry.league`); `normalizeLeagueNames(names: string[] | undefined): string[]`. The template response gains `allMedalLeagues`, and `POST`/`PATCH /category-templates` accept `allMedalLeagues?: string[]`.

- [ ] **Step 1: Create the migration**

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'category_templates';
const COLUMN = 'allMedalLeagues';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
```

- [ ] **Step 2: Create `normalize-league-names.ts`**

```ts
// League names are matched against entry.league as typed on the entry, so
// only surrounding whitespace and duplicates are dropped.
export function normalizeLeagueNames(names: string[] | undefined): string[] {
  return [...new Set((names ?? []).map((name) => name.trim()).filter(Boolean))];
}
```

- [ ] **Step 3: Add the column to `category-template.model.ts`** (after `declare isPublic: boolean;`)

```ts
  // Ліги (за назвою, як на заявці), у яких медаль за місце отримує кожен
  // номер категорії — Дебют, Перші кроки. Решта ліг нагороджує лише 1–3 місця.
  @Column({
    type: DataType.ARRAY(DataType.STRING),
    allowNull: false,
    defaultValue: [],
  })
  declare allMedalLeagues: string[];
```

- [ ] **Step 4: Add the field to `CreateCategoryTemplateDto`** (after `isPublic`; `IsArray`, `IsOptional` and `IsString` are already imported)

```ts
  @ApiPropertyOptional({
    type: [String],
    example: ['Дебют', 'Перші кроки'],
    description:
      'Leagues where every performance of a category gets a place medal.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allMedalLeagues?: string[];
```

- [ ] **Step 5: Carry the field through `category-templates.service.ts`**

Import: `import { normalizeLeagueNames } from './normalize-league-names';`

In `create`, inside `this.templateModel.create({...})` after `isPublic: dto.isPublic ?? false,`:

```ts
      allMedalLeagues: normalizeLeagueNames(dto.allMedalLeagues),
```

In `update`, after `if (dto.isPublic !== undefined) template.isPublic = dto.isPublic;`:

```ts
    if (dto.allMedalLeagues !== undefined) {
      template.allMedalLeagues = normalizeLeagueNames(dto.allMedalLeagues);
    }
```

In `fork`, inside `this.templateModel.create({...})` after `isPublic: false,`:

```ts
      allMedalLeagues: source.allMedalLeagues,
```

In `toDto`, after `isPublic: template.isPublic,`:

```ts
      allMedalLeagues: template.allMedalLeagues ?? [],
```

Then run `grep -n "attributes" backend/src/category-templates/category-templates.service.ts`. If `list()` passes an explicit `attributes: [...]` for the template model, append `'allMedalLeagues'` to that array.

- [ ] **Step 6: Verify**

Run: `cd backend && npm run migrate && npx tsc --noEmit && npm run lint`. Expected: clean.
Manual: `PATCH /category-templates/:id` (as the author) with `{"allMedalLeagues":[" Дебют ","Дебют"]}` responds with `"allMedalLeagues":["Дебют"]`. `POST /category-templates/:id/fork` copies it.

- [ ] **Step 7: Stop — do not commit.**

---

### Task 3: Seed template «Дебют і Перші кроки — медаль кожному»

**Files:**
- Create: `backend/seeders/20260914090000-all-medal-leagues-template.ts`

**Interfaces:**
- Consumes: `category_templates.allMedalLeagues` (Task 2).
- Produces: a public template with id `44444444-4444-4444-8444-444444444444` and 24 nominations (2 ages × 3 leagues × 4 lineups), `allMedalLeagues = ['Дебют', 'Перші кроки']`.

- [ ] **Step 1: Create the seeder**

```ts
import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';
import type { Transaction } from 'sequelize';
import { randomUUID } from 'crypto';

// Публічний шаблон, у якому ліги «Дебют» і «Перші кроки» нагороджують медаллю
// за місце кожен номер категорії, а «Професійна ліга» — лише 1–3 місця.
const MOCK_ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '44444444-4444-4444-8444-444444444444';
const TEMPLATE_NAME = 'Дебют і Перші кроки — медаль кожному';
const TEMPLATE_DESCRIPTION =
  'Вік × ліга × склад. У лігах «Дебют» і «Перші кроки» медаль отримує кожен учасник.';
const SEPARATOR = ' · ';
const SINGLE_EXIT_MODE = 'single';

const LEVEL_TYPE = 'level';
const AGE_TYPE = 'age';
const LINEUP_TYPE = 'lineup';

const DEBUT_LEAGUE = 'Дебют';
const FIRST_STEPS_LEAGUE = 'Перші кроки';
const PRO_LEAGUE = 'Професійна ліга';
const LEAGUES = [DEBUT_LEAGUE, FIRST_STEPS_LEAGUE, PRO_LEAGUE];
const ALL_MEDAL_LEAGUES = [DEBUT_LEAGUE, FIRST_STEPS_LEAGUE];

const LINEUPS = ['Соло', 'Дует', 'Тріо', 'Група'];

const AGE_GROUPS: { name: string; ageFrom: number; ageTo: number }[] = [
  { name: 'Діти', ageFrom: 0, ageTo: 12 },
  { name: 'Дорослі', ageFrom: 13, ageTo: 99 },
];

interface CategoryRow {
  id: string;
  name: string;
  type: string;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await seed(queryInterface, now, transaction);
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('template_nominations', {
      templateId: TEMPLATE_ID,
    });
    await queryInterface.bulkDelete('category_templates', { id: TEMPLATE_ID });
  },
};

// Inserts a category only when one with the same name and axis is missing —
// the demo seeders and organizers may already have created it.
async function ensureCategory(
  queryInterface: QueryInterface,
  transaction: Transaction,
  now: Date,
  category: { name: string; type: string; ageFrom?: number; ageTo?: number },
): Promise<void> {
  await queryInterface.sequelize.query(
    `INSERT INTO categories (id, name, "type", "ageFrom", "ageTo", "createdAt", "updatedAt")
       SELECT :id, :name, '${category.type}', :ageFrom, :ageTo, :now, :now
        WHERE NOT EXISTS (
          SELECT 1 FROM categories
           WHERE lower(btrim(name)) = lower(btrim(:name))
             AND "type" = '${category.type}'
        )`,
    {
      replacements: {
        id: randomUUID(),
        name: category.name,
        ageFrom: category.ageFrom ?? null,
        ageTo: category.ageTo ?? null,
        now,
      },
      transaction,
    },
  );
}

async function seed(
  queryInterface: QueryInterface,
  now: Date,
  transaction: Transaction,
): Promise<void> {
  for (const league of LEAGUES) {
    await ensureCategory(queryInterface, transaction, now, {
      name: league,
      type: LEVEL_TYPE,
    });
  }
  for (const lineup of LINEUPS) {
    await ensureCategory(queryInterface, transaction, now, {
      name: lineup,
      type: LINEUP_TYPE,
    });
  }
  for (const age of AGE_GROUPS) {
    await ensureCategory(queryInterface, transaction, now, {
      name: age.name,
      type: AGE_TYPE,
      ageFrom: age.ageFrom,
      ageTo: age.ageTo,
    });
  }

  const names = [...LEAGUES, ...LINEUPS, ...AGE_GROUPS.map((a) => a.name)];
  const rows = await queryInterface.sequelize.query<CategoryRow>(
    `SELECT id, name, "type" FROM categories
      WHERE lower(btrim(name)) IN (:names)`,
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: { names: names.map((n) => n.toLowerCase()) },
    },
  );

  const idOf = (name: string, type: string): string => {
    const row = rows.find(
      (r) => r.type === type && r.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (!row) throw new Error(`Категорію «${name}» не знайдено після вставки`);
    return row.id;
  };

  await queryInterface.sequelize.query(
    `INSERT INTO category_templates
         (id, name, description, "isPublic", "authorId", "forkedFromId",
          "allMedalLeagues", "createdAt", "updatedAt")
       VALUES (:id, :name, :description, true, :authorId, NULL,
               CAST(ARRAY[:leagues] AS varchar[]), :now, :now)`,
    {
      replacements: {
        id: TEMPLATE_ID,
        name: TEMPLATE_NAME,
        description: TEMPLATE_DESCRIPTION,
        authorId: MOCK_ADMIN_ID,
        leagues: ALL_MEDAL_LEAGUES,
        now,
      },
      transaction,
    },
  );

  let sortOrder = 0;
  for (const age of AGE_GROUPS) {
    for (const league of LEAGUES) {
      for (const lineup of LINEUPS) {
        await queryInterface.sequelize.query(
          `INSERT INTO template_nominations
               (id, "templateId", name, "allowsImprovisation", "categoryIds",
                "isSpecial", "specialName", "exitMode", "sortOrder",
                "createdAt", "updatedAt")
             VALUES (:id, :templateId, :name, false,
                     CAST(ARRAY[:categoryIds] AS uuid[]), false, NULL,
                     CAST('${SINGLE_EXIT_MODE}' AS "enum_template_nominations_exitMode"),
                     :sortOrder, :now, :now)`,
          {
            replacements: {
              id: randomUUID(),
              templateId: TEMPLATE_ID,
              name: [age.name, league, lineup].join(SEPARATOR),
              categoryIds: [
                idOf(age.name, AGE_TYPE),
                idOf(league, LEVEL_TYPE),
                idOf(lineup, LINEUP_TYPE),
              ],
              sortOrder: sortOrder++,
              now,
            },
            transaction,
          },
        );
      }
    }
  }
}
```

- [ ] **Step 2: Verify**

Run: `cd backend && npx sequelize-cli db:seed --seed 20260914090000-all-medal-leagues-template.ts`. Expected: no error.
SQL: `SELECT "allMedalLeagues" FROM category_templates WHERE id = '44444444-4444-4444-8444-444444444444';` gives `{Дебют,"Перші кроки"}`.
SQL: `SELECT count(*) FROM template_nominations WHERE "templateId" = '44444444-4444-4444-8444-444444444444';` gives `24`.
Run: `npx sequelize-cli db:seed:undo --seed 20260914090000-all-medal-leagues-template.ts`, then seed again. Both succeed.

- [ ] **Step 3: Stop — do not commit.**

---

### Task 4: Awards calculator (pure)

**Files:**
- Create: `backend/src/awards/awards.constants.ts`
- Create: `backend/src/awards/award-performance.interface.ts`
- Create: `backend/src/awards/awards-input.interface.ts`
- Create: `backend/src/awards/awards-calculation.interface.ts`
- Create: `backend/src/awards/medal-distribution.ts`
- Create: `backend/src/awards/calculate-awards.ts`
- Modify: `backend/src/entries/entries.constants.ts`

**Interfaces:**
- Consumes: `AwardSystem`, `MEDAL_STANDINGS_AWARD_SYSTEM` (Task 1).
- Produces:
  - `AwardPerformance { entryId; categoryKey; participantIds: string[]; participantsCount: number; isGroup: boolean; cupLabel: string; allMedals: boolean; specialName: string | null }`
  - `AwardsInput { awardSystem: AwardSystem; performances: AwardPerformance[] }`
  - `AwardsCalculation { performancesInProgram; placeMedals: PlaceMedals; participationMedals; cups: CupCount[]; diplomas; specials: SpecialAwardSummary[] }`
  - `PlaceMedals { first; second; third }`, `CupCount { label; count }`, `SpecialAwardSummary { name; winners; participations }`
  - `distributeAllPlaces(n): number[]`, `distributeTopPlaces(n): number[]`, `calculateAwards(input): AwardsCalculation`
  - `MIN_PARTICIPANTS_PER_ENTRY` in `entries.constants.ts` (reused by Tasks 5 and 8)

- [ ] **Step 1: Append to `entries.constants.ts`**

```ts
// An entry typed in by hand without dancers still puts one person on stage.
export const MIN_PARTICIPANTS_PER_ENTRY = 1;
```

- [ ] **Step 2: Create `awards.constants.ts`**

```ts
import type { CategoryType } from '../categories/category.model';

// Places that earn a place medal.
export const PRIZE_PLACES_COUNT = 3;
export const FIRST_PLACE_INDEX = 0;
export const SECOND_PLACE_INDEX = 1;
export const THIRD_PLACE_INDEX = 2;

// Outside «медаль кожному» a single performance takes each prize place.
export const PERFORMANCES_PER_TOP_PLACE = 1;
export const NO_PERFORMANCES = 0;

// A group performance is one cup, whatever its place.
export const CUPS_PER_GROUP_PERFORMANCE = 1;
// Every category of a special nomination has exactly one 1st place.
export const WINNERS_PER_SPECIAL_CATEGORY = 1;

export const PARTICIPATION_KEY_SEPARATOR = '|';
export const ENTRY_PARTICIPATION_KEY_PREFIX = 'entry:';
export const SPECIAL_NAME_KEY_SEPARATOR = '|';
export const CATEGORY_IDS_SEPARATOR = ',';
export const AWARD_LINE_KEY_SEPARATOR = ':';

export const LINEUP_CATEGORY_TYPE: CategoryType = 'lineup';

// Sanity ceiling for the awards queries, same order as the schedule's cap.
export const MAX_AWARDS_QUERY_ROWS = 5000;

// Manual override bounds.
export const MIN_AWARD_QUANTITY = 0;
export const MAX_AWARD_LINE_KEY_LENGTH = 300;
```

- [ ] **Step 3: Create `award-performance.interface.ts`**

```ts
// One performance placed in the program, already resolved from the ORM:
// the calculator never touches Sequelize.
export interface AwardPerformance {
  entryId: string;
  // Performances sharing this key compete in one category.
  categoryKey: string;
  participantIds: string[];
  participantsCount: number;
  // 4+ dancers — a cup and participation medals instead of place medals.
  isGroup: boolean;
  // Lineup category name of the nomination (Група / Формейшн / Продакшн).
  cupLabel: string;
  // The nomination's league is marked «медаль кожному» in its template.
  allMedals: boolean;
  // Set for a special nomination; such performances are counted apart.
  specialName: string | null;
}
```

- [ ] **Step 4: Create `awards-input.interface.ts`**

```ts
import type { AwardSystem } from './award-system';
import type { AwardPerformance } from './award-performance.interface';

export interface AwardsInput {
  awardSystem: AwardSystem;
  performances: AwardPerformance[];
}
```

- [ ] **Step 5: Create `awards-calculation.interface.ts`**

```ts
export interface PlaceMedals {
  first: number;
  second: number;
  third: number;
}

export interface CupCount {
  label: string;
  count: number;
}

export interface SpecialAwardSummary {
  name: string;
  // One 1st place per category of the special nomination.
  winners: number;
  participations: number;
}

export interface AwardsCalculation {
  performancesInProgram: number;
  placeMedals: PlaceMedals;
  participationMedals: number;
  cups: CupCount[];
  diplomas: number;
  specials: SpecialAwardSummary[];
}
```

- [ ] **Step 6: Create `medal-distribution.ts`**

```ts
import {
  NO_PERFORMANCES,
  PERFORMANCES_PER_TOP_PLACE,
  PRIZE_PLACES_COUNT,
} from './awards.constants';

// «Медаль кожному» / «медальний залік»: every performance gets a place,
// split as evenly as possible with the surplus on the better places —
// 3 → 1/1/1, 4 → 2/1/1, 5 → 2/2/1, 14 → 5/5/4.
export function distributeAllPlaces(performances: number): number[] {
  const places: number[] = [];
  let remaining = performances;
  for (let placesLeft = PRIZE_PLACES_COUNT; placesLeft > 0; placesLeft -= 1) {
    const count = Math.ceil(remaining / placesLeft);
    places.push(count);
    remaining -= count;
  }
  return places;
}

// Every other league: one performance per prize place, fewer places when
// the category is smaller than three.
export function distributeTopPlaces(performances: number): number[] {
  const places: number[] = [];
  for (let place = 0; place < PRIZE_PLACES_COUNT; place += 1) {
    places.push(
      place < performances ? PERFORMANCES_PER_TOP_PLACE : NO_PERFORMANCES,
    );
  }
  return places;
}
```

- [ ] **Step 7: Create `calculate-awards.ts`**

```ts
import { MEDAL_STANDINGS_AWARD_SYSTEM } from './award-system';
import {
  CUPS_PER_GROUP_PERFORMANCE,
  ENTRY_PARTICIPATION_KEY_PREFIX,
  FIRST_PLACE_INDEX,
  PARTICIPATION_KEY_SEPARATOR,
  PRIZE_PLACES_COUNT,
  SECOND_PLACE_INDEX,
  THIRD_PLACE_INDEX,
  WINNERS_PER_SPECIAL_CATEGORY,
} from './awards.constants';
import { distributeAllPlaces, distributeTopPlaces } from './medal-distribution';
import type { AwardPerformance } from './award-performance.interface';
import type { AwardsInput } from './awards-input.interface';
import type {
  AwardsCalculation,
  SpecialAwardSummary,
} from './awards-calculation.interface';

function participationKey(performance: AwardPerformance): string {
  if (performance.participantIds.length === 0) {
    return `${ENTRY_PARTICIPATION_KEY_PREFIX}${performance.entryId}`;
  }
  return [...performance.participantIds]
    .sort()
    .join(PARTICIPATION_KEY_SEPARATOR);
}

// A nomination danced per program puts the same dancers on stage several
// times in one category — still one participation, one set of awards.
function uniqueParticipations(
  performances: AwardPerformance[],
): AwardPerformance[] {
  const byKey = new Map<string, AwardPerformance>();
  for (const performance of performances) {
    const key = participationKey(performance);
    if (!byKey.has(key)) byKey.set(key, performance);
  }
  return [...byKey.values()];
}

function groupByCategory(
  performances: AwardPerformance[],
): AwardPerformance[][] {
  const byCategory = new Map<string, AwardPerformance[]>();
  for (const performance of performances) {
    const bucket = byCategory.get(performance.categoryKey);
    if (bucket) bucket.push(performance);
    else byCategory.set(performance.categoryKey, [performance]);
  }
  return [...byCategory.values()];
}

export function calculateAwards(input: AwardsInput): AwardsCalculation {
  const medalStandings = input.awardSystem === MEDAL_STANDINGS_AWARD_SYSTEM;
  const placeMedals = new Array<number>(PRIZE_PLACES_COUNT).fill(0);
  const cups = new Map<string, number>();
  const specials = new Map<string, SpecialAwardSummary>();
  let participationMedals = 0;
  let diplomas = 0;

  for (const category of groupByCategory(input.performances)) {
    const participations = uniqueParticipations(category);
    const specialName = participations[0].specialName;

    if (specialName !== null) {
      const summary = specials.get(specialName) ?? {
        name: specialName,
        winners: 0,
        participations: 0,
      };
      summary.winners += WINNERS_PER_SPECIAL_CATEGORY;
      summary.participations += participations.length;
      specials.set(specialName, summary);
      continue;
    }

    for (const participation of participations) {
      diplomas += participation.participantsCount;
    }

    const groups = participations.filter((p) => p.isGroup);
    for (const group of groups) {
      cups.set(
        group.cupLabel,
        (cups.get(group.cupLabel) ?? 0) + CUPS_PER_GROUP_PERFORMANCE,
      );
      participationMedals += group.participantsCount;
    }

    const individuals = participations.filter((p) => !p.isGroup);
    if (individuals.length === 0) continue;

    const spreadOverAll = medalStandings || individuals[0].allMedals;
    const places = spreadOverAll
      ? distributeAllPlaces(individuals.length)
      : distributeTopPlaces(individuals.length);
    const medalsPerPerformance = Math.max(
      ...individuals.map((p) => p.participantsCount),
    );
    places.forEach((performancesAtPlace, place) => {
      placeMedals[place] += performancesAtPlace * medalsPerPerformance;
    });
  }

  return {
    performancesInProgram: input.performances.length,
    placeMedals: {
      first: placeMedals[FIRST_PLACE_INDEX],
      second: placeMedals[SECOND_PLACE_INDEX],
      third: placeMedals[THIRD_PLACE_INDEX],
    },
    participationMedals,
    cups: [...cups].map(([label, count]) => ({ label, count })),
    diplomas,
    specials: [...specials.values()],
  };
}
```

- [ ] **Step 8: Check the worked examples with a throwaway script (not a test file, delete afterwards)**

Create `backend/awards-check.tmp.ts`:

```ts
import { calculateAwards } from './src/awards/calculate-awards';
import { distributeAllPlaces } from './src/awards/medal-distribution';
import type { AwardPerformance } from './src/awards/award-performance.interface';

let seq = 0;
function make(
  categoryKey: string,
  count: number,
  size: number,
  extra: Partial<AwardPerformance> = {},
): AwardPerformance[] {
  const list: AwardPerformance[] = [];
  for (let i = 0; i < count; i += 1) {
    seq += 1;
    const participantIds: string[] = [];
    for (let d = 0; d < size; d += 1) participantIds.push(`p${seq}-${d}`);
    list.push({
      entryId: `e${seq}`,
      categoryKey,
      participantIds,
      participantsCount: size,
      isGroup: false,
      cupLabel: 'Група',
      allMedals: false,
      specialName: null,
      ...extra,
    });
  }
  return list;
}

console.log([3, 4, 5, 14].map((n) => distributeAllPlaces(n)));

const performances = [
  ...make('debut-solo', 14, 1, { allMedals: true }),
  ...make('pro-solo', 5, 1),
  ...make('pro-duo', 2, 2),
  ...make('groups', 1, 8, { isGroup: true }),
  ...make('groups', 1, 13, { isGroup: true }),
  ...make('groups', 1, 23, { isGroup: true }),
  ...make('crown-1', 6, 1, { specialName: 'Корона' }),
  ...make('crown-2', 6, 1, { specialName: 'Корона' }),
  ...make('crown-3', 6, 1, { specialName: 'Корона' }),
  ...make('crown-4', 6, 1, { specialName: 'Корона' }),
];

console.log(JSON.stringify(calculateAwards({ awardSystem: 'standard', performances })));
console.log(JSON.stringify(calculateAwards({ awardSystem: 'medal_standings', performances })));
```

Run: `cd backend && npx ts-node -T awards-check.tmp.ts`
Expected:
- `[ [ 1, 1, 1 ], [ 2, 1, 1 ], [ 2, 2, 1 ], [ 5, 5, 4 ] ]`
- standard: `performancesInProgram 48`, `placeMedals {first:8, second:8, third:5}`, `participationMedals 44`, `cups [{label:"Група",count:3}]`, `diplomas 67`, `specials [{name:"Корона",winners:4,participations:24}]`
- medal_standings: `placeMedals {first:9, second:9, third:5}`. Everything else is the same.

Delete it: `rm backend/awards-check.tmp.ts`.
Run: `cd backend && npx tsc --noEmit && npm run lint`. Expected: clean.

- [ ] **Step 9: Stop — do not commit.**

---

### Task 5: Awards API — report, system switch, manual overrides

**Files:**
- Create: `backend/src/awards/award-line-kind.ts`
- Create: `backend/src/awards/award-line.interface.ts`
- Create: `backend/src/awards/awards-report.interface.ts`
- Create: `backend/src/awards/build-award-lines.ts`
- Create: `backend/src/awards/special-name-key.ts`
- Create: `backend/src/awards/award-performance-resolver.ts`
- Create: `backend/src/awards/dto/update-award-system.dto.ts`
- Create: `backend/src/awards/dto/update-award-override.dto.ts`
- Create: `backend/src/awards/awards.service.ts`
- Create: `backend/src/awards/awards.controller.ts`
- Create: `backend/src/awards/awards.module.ts`
- Modify: `backend/src/schedule/schedule.service.ts`, `backend/src/schedule/schedule.module.ts`
- Modify: `backend/src/entries/entries.service.ts`
- Modify: `backend/src/app.module.ts`

**Interfaces:**
- Consumes: Task 1 (`AwardSettings`, `AWARD_SYSTEMS`), Task 2 (`CategoryTemplate.allMedalLeagues`), Task 4 (`calculateAwards`, `AwardsCalculation`, constants), existing `TemplateNomination.specialName`.
- Produces:
  - `AWARD_LINE_KINDS = ['first_place_medals','second_place_medals','third_place_medals','participation_medals','cups','diplomas','special_winners','special_participations']`, `AwardLineKind`
  - `AwardLine { key: string; kind: AwardLineKind; subject: string | null; calculated: number; override: number | null }`. `subject` is the cup lineup label or the special name. `key` is `kind` for single lines and `kind:subject` for the rest.
  - `AwardsReport { awardSystem: AwardSystem; performancesInProgram: number; lines: AwardLine[] }`
  - `GET /competitions/:competitionId/awards` returns `AwardsReport`.
  - `PATCH /competitions/:competitionId/awards/system` with `{ awardSystem }` returns `AwardsReport`.
  - `PATCH /competitions/:competitionId/awards/overrides` with `{ key: string, value: number | null }` (`null` resets) returns `AwardsReport`.
  - All three are allowed for the global ADMIN, the owner, or a competition team admin. Everyone else gets 403.

- [ ] **Step 1: Make the reused helpers public**

`backend/src/schedule/schedule.service.ts`: change
`  private async assignedEntryIds(competitionId: string): Promise<string[]> {`
to
`  async assignedEntryIds(competitionId: string): Promise<string[]> {`

`backend/src/schedule/schedule.module.ts`: add `exports: [ScheduleService],` after `providers: [ScheduleService],`.

`backend/src/entries/entries.service.ts`: change `  private async loadCompetitionAndAssertAccess(` to `  async loadCompetitionAndAssertAccess(`. This is the overload with `requesterLevel: AccessLevel`, near line 568; it already lets a global admin, the owner and team admins through.

- [ ] **Step 2: Create `award-line-kind.ts`**

```ts
export const AWARD_LINE_KINDS = [
  'first_place_medals',
  'second_place_medals',
  'third_place_medals',
  'participation_medals',
  'cups',
  'diplomas',
  'special_winners',
  'special_participations',
] as const;
export type AwardLineKind = (typeof AWARD_LINE_KINDS)[number];

export const FIRST_PLACE_MEDALS: AwardLineKind = 'first_place_medals';
export const SECOND_PLACE_MEDALS: AwardLineKind = 'second_place_medals';
export const THIRD_PLACE_MEDALS: AwardLineKind = 'third_place_medals';
export const PARTICIPATION_MEDALS: AwardLineKind = 'participation_medals';
export const CUPS: AwardLineKind = 'cups';
export const DIPLOMAS: AwardLineKind = 'diplomas';
export const SPECIAL_WINNERS: AwardLineKind = 'special_winners';
export const SPECIAL_PARTICIPATIONS: AwardLineKind = 'special_participations';
```

- [ ] **Step 3: Create `award-line.interface.ts`**

```ts
import type { AwardLineKind } from './award-line-kind';

export interface AwardLine {
  // Stable id of the line; overrides are stored under it.
  key: string;
  kind: AwardLineKind;
  // Cup lineup label or special nomination name; null for single lines.
  subject: string | null;
  calculated: number;
  override: number | null;
}
```

- [ ] **Step 4: Create `awards-report.interface.ts`**

```ts
import type { AwardSystem } from './award-system';
import type { AwardLine } from './award-line.interface';

export interface AwardsReport {
  awardSystem: AwardSystem;
  performancesInProgram: number;
  lines: AwardLine[];
}
```

- [ ] **Step 5: Create `build-award-lines.ts`**

```ts
import {
  CUPS,
  DIPLOMAS,
  FIRST_PLACE_MEDALS,
  PARTICIPATION_MEDALS,
  SECOND_PLACE_MEDALS,
  SPECIAL_PARTICIPATIONS,
  SPECIAL_WINNERS,
  THIRD_PLACE_MEDALS,
} from './award-line-kind';
import type { AwardLineKind } from './award-line-kind';
import { AWARD_LINE_KEY_SEPARATOR } from './awards.constants';
import type { AwardLine } from './award-line.interface';
import type { AwardsCalculation } from './awards-calculation.interface';

function lineOf(
  kind: AwardLineKind,
  calculated: number,
  overrides: Record<string, number>,
  subject: string | null = null,
): AwardLine {
  const key =
    subject === null ? kind : `${kind}${AWARD_LINE_KEY_SEPARATOR}${subject}`;
  return { key, kind, subject, calculated, override: overrides[key] ?? null };
}

// Flattens the calculation into the purchase list the organizer edits.
export function buildAwardLines(
  calculation: AwardsCalculation,
  overrides: Record<string, number>,
): AwardLine[] {
  return [
    lineOf(FIRST_PLACE_MEDALS, calculation.placeMedals.first, overrides),
    lineOf(SECOND_PLACE_MEDALS, calculation.placeMedals.second, overrides),
    lineOf(THIRD_PLACE_MEDALS, calculation.placeMedals.third, overrides),
    lineOf(PARTICIPATION_MEDALS, calculation.participationMedals, overrides),
    ...calculation.cups.map((cup) =>
      lineOf(CUPS, cup.count, overrides, cup.label),
    ),
    lineOf(DIPLOMAS, calculation.diplomas, overrides),
    ...calculation.specials.flatMap((special) => [
      lineOf(SPECIAL_WINNERS, special.winners, overrides, special.name),
      lineOf(
        SPECIAL_PARTICIPATIONS,
        special.participations,
        overrides,
        special.name,
      ),
    ]),
  ];
}
```

- [ ] **Step 6: Create `special-name-key.ts`**

```ts
import {
  CATEGORY_IDS_SEPARATOR,
  SPECIAL_NAME_KEY_SEPARATOR,
} from './awards.constants';

// A competition nomination generated from a template keeps its templateId
// and the template nomination's categoryIds — that pair finds the template
// special category and its bare `specialName`, which the competition
// nomination itself does not store. Names are not used: the organizer may
// rename a nomination in the wizard.
export function specialNameKey(
  templateId: string,
  categoryIds: string[],
): string {
  return `${templateId}${SPECIAL_NAME_KEY_SEPARATOR}${[...categoryIds]
    .sort()
    .join(CATEGORY_IDS_SEPARATOR)}`;
}
```

- [ ] **Step 7: Create `award-performance-resolver.ts`**

```ts
import type { Category } from '../categories/category.model';
import type { Entry } from '../entries/entry.model';
import { LINEUP_LABELS } from '../entries/lineup';
import { MIN_PARTICIPANTS_PER_ENTRY } from '../entries/entries.constants';
import type { Nomination } from '../nominations/nomination.model';
import { LINEUP_CATEGORY_TYPE } from './awards.constants';
import type { AwardPerformance } from './award-performance.interface';
import { specialNameKey } from './special-name-key';

// Turns a program entry into the calculator's plain shape, looking up its
// nomination, the template's «медаль кожному» leagues, the template's
// special name and the nomination's lineup category.
export class AwardPerformanceResolver {
  constructor(
    private readonly nominationsById: Map<string, Nomination>,
    private readonly allMedalLeaguesByTemplate: Map<string, string[]>,
    private readonly specialNamesByKey: Map<string, string>,
    private readonly categoriesById: Map<string, Category>,
  ) {}

  resolve(entry: Entry): AwardPerformance {
    const nomination = entry.nominationId
      ? this.nominationsById.get(entry.nominationId)
      : undefined;
    const participantIds = entry.participantIds ?? [];

    return {
      entryId: entry.id,
      categoryKey: entry.nominationId ?? entry.nomination,
      participantIds,
      participantsCount: Math.max(
        entry.participantsCount ?? participantIds.length,
        MIN_PARTICIPANTS_PER_ENTRY,
      ),
      isGroup: entry.lineup === LINEUP_LABELS.GROUP,
      cupLabel: this.cupLabelOf(nomination),
      allMedals: this.isAllMedalLeague(nomination, entry.league),
      specialName: this.specialNameOf(nomination),
    };
  }

  private specialNameOf(nomination: Nomination | undefined): string | null {
    if (!nomination?.isSpecial) return null;
    const fromTemplate = nomination.templateId
      ? this.specialNamesByKey.get(
          specialNameKey(nomination.templateId, nomination.categoryIds ?? []),
        )
      : undefined;
    return fromTemplate ?? nomination.name;
  }

  private cupLabelOf(nomination: Nomination | undefined): string {
    const lineup = (nomination?.categoryIds ?? [])
      .map((id) => this.categoriesById.get(id))
      .find((category) => category?.type === LINEUP_CATEGORY_TYPE);
    return lineup?.name ?? LINEUP_LABELS.GROUP;
  }

  private isAllMedalLeague(
    nomination: Nomination | undefined,
    league: string | null,
  ): boolean {
    if (!nomination?.templateId || !league) return false;
    const leagues =
      this.allMedalLeaguesByTemplate.get(nomination.templateId) ?? [];
    return leagues.includes(league.trim());
  }
}
```

- [ ] **Step 8: Create the DTOs**

`dto/update-award-system.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { AWARD_SYSTEMS } from '../award-system';
import type { AwardSystem } from '../award-system';

export class UpdateAwardSystemDto {
  @ApiProperty({
    example: 'medal_standings',
    enum: AWARD_SYSTEMS,
    description:
      'standard — only «медаль кожному» leagues spread medals; medal_standings — every category does.',
  })
  @IsIn(AWARD_SYSTEMS)
  awardSystem: AwardSystem;
}
```

`dto/update-award-override.dto.ts`:

```ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import {
  MAX_AWARD_LINE_KEY_LENGTH,
  MIN_AWARD_QUANTITY,
} from '../awards.constants';

export class UpdateAwardOverrideDto {
  @ApiProperty({ example: 'cups:Формейшн', description: 'AwardLine.key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_AWARD_LINE_KEY_LENGTH)
  key: string;

  @ApiProperty({
    example: 5,
    nullable: true,
    description: 'Hand-typed quantity; null resets the line to the calculated value.',
  })
  @ValidateIf((_, value) => value !== null)
  @IsInt()
  @Min(MIN_AWARD_QUANTITY)
  value: number | null;
}
```

- [ ] **Step 9: Create `awards.service.ts`**

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CategoriesService } from '../categories/categories.service';
import type { Category } from '../categories/category.model';
import { CategoryTemplate } from '../category-templates/category-template.model';
import { TemplateNomination } from '../category-templates/template-nomination.model';
import { Entry } from '../entries/entry.model';
import { EntriesService } from '../entries/entries.service';
import { Nomination } from '../nominations/nomination.model';
import { ScheduleService } from '../schedule/schedule.service';
import { AwardPerformanceResolver } from './award-performance-resolver';
import { AwardSettings } from './award-settings.model';
import { MAX_AWARDS_QUERY_ROWS } from './awards.constants';
import type { AwardsReport } from './awards-report.interface';
import { buildAwardLines } from './build-award-lines';
import { calculateAwards } from './calculate-awards';
import { UpdateAwardOverrideDto } from './dto/update-award-override.dto';
import { UpdateAwardSystemDto } from './dto/update-award-system.dto';
import { specialNameKey } from './special-name-key';

@Injectable()
export class AwardsService {
  constructor(
    @InjectModel(AwardSettings)
    private readonly settingsModel: typeof AwardSettings,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    @InjectModel(CategoryTemplate)
    private readonly templateModel: typeof CategoryTemplate,
    @InjectModel(TemplateNomination)
    private readonly templateNominationModel: typeof TemplateNomination,
    private readonly entriesService: EntriesService,
    private readonly scheduleService: ScheduleService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async report(
    competitionId: string,
    user: AuthenticatedUser,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    return this.buildReport(competitionId);
  }

  async setAwardSystem(
    competitionId: string,
    user: AuthenticatedUser,
    dto: UpdateAwardSystemDto,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    const settings = await this.settingsOf(competitionId);
    await settings.update({ awardSystem: dto.awardSystem });
    return this.buildReport(competitionId);
  }

  async setOverride(
    competitionId: string,
    user: AuthenticatedUser,
    dto: UpdateAwardOverrideDto,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    const settings = await this.settingsOf(competitionId);
    const overrides = { ...settings.overrides };
    if (dto.value === null) delete overrides[dto.key];
    else overrides[dto.key] = dto.value;
    await settings.update({ overrides });
    return this.buildReport(competitionId);
  }

  private async assertStaff(
    competitionId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.entriesService.loadCompetitionAndAssertAccess(
      competitionId,
      user.id,
      user.accessLevel,
    );
  }

  private async settingsOf(competitionId: string): Promise<AwardSettings> {
    const [settings] = await this.settingsModel.findOrCreate({
      where: { competitionId },
      defaults: { competitionId } as CreationAttributes<AwardSettings>,
    });
    return settings;
  }

  // Only exits placed in the program count — what really goes on stage.
  private async buildReport(competitionId: string): Promise<AwardsReport> {
    const settings = await this.settingsOf(competitionId);
    const entryIds =
      await this.scheduleService.assignedEntryIds(competitionId);
    const entries =
      entryIds.length === 0
        ? []
        : await this.entryModel.findAll({
            where: { competitionId, id: { [Op.in]: entryIds } },
            limit: MAX_AWARDS_QUERY_ROWS,
          });
    const nominations = await this.nominationModel.findAll({
      where: { competitionId },
      limit: MAX_AWARDS_QUERY_ROWS,
    });
    const templateIds = this.templateIdsOf(nominations);

    const resolver = new AwardPerformanceResolver(
      new Map(nominations.map((n) => [n.id, n])),
      await this.allMedalLeaguesByTemplate(templateIds),
      await this.specialNamesByKey(templateIds),
      await this.categoriesById(nominations),
    );

    const calculation = calculateAwards({
      awardSystem: settings.awardSystem,
      performances: entries.map((entry) => resolver.resolve(entry)),
    });

    return {
      awardSystem: settings.awardSystem,
      performancesInProgram: calculation.performancesInProgram,
      lines: buildAwardLines(calculation, settings.overrides ?? {}),
    };
  }

  private templateIdsOf(nominations: Nomination[]): string[] {
    return [
      ...new Set(
        nominations
          .map((n) => n.templateId)
          .filter((id): id is string => id !== null),
      ),
    ];
  }

  private async allMedalLeaguesByTemplate(
    templateIds: string[],
  ): Promise<Map<string, string[]>> {
    if (templateIds.length === 0) return new Map();
    const templates = await this.templateModel.findAll({
      where: { id: { [Op.in]: templateIds } },
      attributes: ['id', 'allMedalLeagues'],
    });
    return new Map(templates.map((t) => [t.id, t.allMedalLeagues ?? []]));
  }

  // Existing data: the bare name of a special category lives on the
  // template nomination (template_nominations.specialName).
  private async specialNamesByKey(
    templateIds: string[],
  ): Promise<Map<string, string>> {
    if (templateIds.length === 0) return new Map();
    const specials = await this.templateNominationModel.findAll({
      where: {
        templateId: { [Op.in]: templateIds },
        isSpecial: true,
        specialName: { [Op.ne]: null },
      },
      attributes: ['templateId', 'categoryIds', 'specialName'],
      limit: MAX_AWARDS_QUERY_ROWS,
    });
    return new Map(
      specials.map((s) => [
        specialNameKey(s.templateId, s.categoryIds ?? []),
        s.specialName as string,
      ]),
    );
  }

  private async categoriesById(
    nominations: Nomination[],
  ): Promise<Map<string, Category>> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    const categories = await this.categoriesService.findByIds(ids);
    return new Map(categories.map((c) => [c.id, c]));
  }
}
```

- [ ] **Step 10: Create `awards.controller.ts`**

```ts
import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AwardsService } from './awards.service';
import { UpdateAwardOverrideDto } from './dto/update-award-override.dto';
import { UpdateAwardSystemDto } from './dto/update-award-system.dto';

@ApiTags('awards')
@Controller('competitions/:competitionId/awards')
export class AwardsController {
  constructor(private readonly awardsService: AwardsService) {}

  @ApiOperation({
    summary: 'Medals, cups and diplomas to buy for the program as built',
  })
  @ApiResponse({ status: 200, description: 'Awards report returned.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiResponse({ status: 404, description: 'No such competition.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  report(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.awardsService.report(competitionId, user);
  }

  @ApiOperation({ summary: 'Switch the award system (медальний залік)' })
  @ApiResponse({ status: 200, description: 'Saved; recalculated report.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('system')
  setAwardSystem(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAwardSystemDto,
  ) {
    return this.awardsService.setAwardSystem(competitionId, user, dto);
  }

  @ApiOperation({ summary: 'Set or reset a hand-typed quantity for a line' })
  @ApiResponse({ status: 200, description: 'Saved; report with overrides.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('overrides')
  setOverride(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAwardOverrideDto,
  ) {
    return this.awardsService.setOverride(competitionId, user, dto);
  }
}
```

- [ ] **Step 11: Create `awards.module.ts`**

```ts
import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { CategoriesModule } from '../categories/categories.module';
import { CategoryTemplate } from '../category-templates/category-template.model';
import { TemplateNomination } from '../category-templates/template-nomination.model';
import { Entry } from '../entries/entry.model';
import { EntriesModule } from '../entries/entries.module';
import { Nomination } from '../nominations/nomination.model';
import { ScheduleModule } from '../schedule/schedule.module';
import { AwardSettings } from './award-settings.model';
import { AwardsController } from './awards.controller';
import { AwardsService } from './awards.service';

@Module({
  imports: [
    SequelizeModule.forFeature([
      AwardSettings,
      Entry,
      Nomination,
      CategoryTemplate,
      TemplateNomination,
    ]),
    EntriesModule,
    ScheduleModule,
    CategoriesModule,
  ],
  controllers: [AwardsController],
  providers: [AwardsService],
})
export class AwardsModule {}
```

- [ ] **Step 12: Register in `app.module.ts`**

Add `import { AwardsModule } from './awards/awards.module';` after the `ScheduleModule` import, and `AwardsModule,` after `ScheduleModule,` in `imports`.

- [ ] **Step 13: Verify**

Run: `cd backend && npx tsc --noEmit && npm run lint`. Expected: clean.
Manual (backend running, a competition created from a template that has a special category, with a built program):
- As owner, `GET /competitions/:id/awards` returns 200. `lines` holds the three place-medal lines, participation medals, cups, diplomas and a pair of `special_*` lines whose `subject` is the bare special name (e.g. «Корона»), not the full label.
- As a participant: 403.
- `PATCH …/awards/system` with `{"awardSystem":"medal_standings"}` returns a report with `"awardSystem":"medal_standings"`.
- `PATCH …/awards/overrides` with `{"key":"diplomas","value":100}` shows the `diplomas` line with `override: 100` and `calculated` unchanged.
- `{"key":"diplomas","value":null}` sets `override: null` again.
- `{"key":"diplomas","value":-1}` and `{"key":"diplomas"}` both return 400.
- Remove one exit from a section, and `performancesInProgram` drops by 1.

- [ ] **Step 14: Stop — do not commit.**

---

### Task 6: Frontend — «медаль кожному» leagues in the template form

**Files:**
- Create: `frontend/src/components/nominations/AllMedalLeaguesField.tsx`
- Create: `frontend/src/components/nominations/AllMedalLeaguesField.constants.ts`
- Create: `frontend/src/components/nominations/AllMedalLeaguesField.module.css`
- Modify: `frontend/src/lib/categories.ts`
- Modify: `frontend/src/lib/categoryTemplates.ts`
- Modify: `frontend/src/pages/CategoryTemplateFormPage.tsx`

**Interfaces:**
- Consumes: template API `allMedalLeagues` (Task 2).
- Produces: `LEAGUE_CATEGORY_TYPE`; `CategoryTemplate.allMedalLeagues: string[]`; `CategoryTemplateInput.allMedalLeagues?: string[]`; component `AllMedalLeaguesField({ leagueNames, selected, onChange })`.

- [ ] **Step 1: Types and constants in `lib/`**

`frontend/src/lib/categories.ts`, after `export const AGE_CATEGORY_TYPE ...`:

```ts
// Вісь, значення якої — ліги (Дебют, Перші кроки, Професійна ліга).
export const LEAGUE_CATEGORY_TYPE: CategoryType = 'level';
```

`frontend/src/lib/categoryTemplates.ts`: in `interface CategoryTemplate` after `isPublic: boolean;` add `allMedalLeagues: string[];`. In `interface CategoryTemplateInput` after `isPublic?: boolean;` add `allMedalLeagues?: string[];`.

- [ ] **Step 2: Create `AllMedalLeaguesField.constants.ts`**

```ts
export const ALL_MEDAL_LEAGUES_TITLE = 'Нагородження';
export const ALL_MEDAL_LEAGUES_HINT =
  'Відмітьте ліги, у яких медаль за місце отримує кожен номер категорії (наприклад, Дебют, Перші кроки). В інших лігах медалі отримують лише 1–3 місця.';
export const NO_LEAGUES_HINT =
  'Додайте в номінації вісь «Ліга», щоб обрати ліги з медаллю кожному.';
```

- [ ] **Step 3: Create `AllMedalLeaguesField.module.css`**

```css
.title {
  margin: 0 0 4px;
  font-weight: 700;
}

.hint {
  margin: 0 0 12px;
  color: var(--g-muted);
  font-size: 13.5px;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 20px;
}

.option {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}
```

- [ ] **Step 4: Create `AllMedalLeaguesField.tsx`**

```tsx
import {
  ALL_MEDAL_LEAGUES_HINT,
  ALL_MEDAL_LEAGUES_TITLE,
  NO_LEAGUES_HINT,
} from './AllMedalLeaguesField.constants';
import styles from './AllMedalLeaguesField.module.css';

interface AllMedalLeaguesFieldProps {
  leagueNames: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}

export default function AllMedalLeaguesField({
  leagueNames,
  selected,
  onChange,
}: AllMedalLeaguesFieldProps) {
  const toggle = (name: string, checked: boolean) =>
    onChange(
      checked ? [...selected, name] : selected.filter((s) => s !== name),
    );

  return (
    <>
      <p className={styles.title}>{ALL_MEDAL_LEAGUES_TITLE}</p>
      <p className={styles.hint}>
        {leagueNames.length === 0 ? NO_LEAGUES_HINT : ALL_MEDAL_LEAGUES_HINT}
      </p>
      {leagueNames.length > 0 && (
        <div className={styles.options}>
          {leagueNames.map((name) => (
            <label key={name} className={styles.option}>
              <input
                type="checkbox"
                checked={selected.includes(name)}
                onChange={(e) => toggle(name, e.target.checked)}
              />
              {name}
            </label>
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 5: Wire into `CategoryTemplateFormPage.tsx`**

Imports: replace `import { CategoryApiError } from '../lib/categories';` with

```tsx
import { CategoryApiError, getCategories, LEAGUE_CATEGORY_TYPE } from '../lib/categories';
```

and add

```tsx
import AllMedalLeaguesField from '../components/nominations/AllMedalLeaguesField';
```

State, after `const [extraCategories, ...]`:

```tsx
  const [allMedalLeagues, setAllMedalLeagues] = useState<string[]>([]);
  // Persisted league values — on edit the builder's axes stay null until the
  // organizer touches them, so names for saved ids come from here.
  const [leagueCategories, setLeagueCategories] = useState<Category[]>([]);
```

In the load effect's `.then((detail) => {`, after `setIsPublic(detail.isPublic);`:

```tsx
        setAllMedalLeagues(detail.allMedalLeagues ?? []);
```

New effect, after the load effect:

```tsx
  useEffect(() => {
    getCategories(LEAGUE_CATEGORY_TYPE)
      .then(setLeagueCategories)
      .catch(() => setLeagueCategories([]));
  }, []);
```

Memo, after `seedCategoryIds`:

```tsx
  // Leagues actually used by this template's nominations, by name — the same
  // name an entry carries in `league`.
  const leagueNames = useMemo(() => {
    const used = new Set(nominations.flatMap((n) => n.categoryIds));
    const known = [
      ...leagueCategories,
      ...(axes?.[LEAGUE_CATEGORY_TYPE] ?? []),
      ...extraCategories,
    ];
    return [
      ...new Set(
        known
          .filter((c) => c.type === LEAGUE_CATEGORY_TYPE && used.has(c.id))
          .map((c) => c.name.trim()),
      ),
    ].sort();
  }, [nominations, leagueCategories, axes, extraCategories]);
```

In `save`, inside `payload` after `isPublic,`:

```tsx
      allMedalLeagues: allMedalLeagues.filter((name) => leagueNames.includes(name)),
```

Render, directly after `<NominationSetBuilder … />` and before `<div className={styles.actions}>`:

```tsx
              <section className={styles.panel}>
                <AllMedalLeaguesField
                  leagueNames={leagueNames}
                  selected={allMedalLeagues}
                  onChange={setAllMedalLeagues}
                />
              </section>
```

- [ ] **Step 6: Verify**

Run: `cd frontend && npm run build && npm run lint`. Expected: clean.
Manual:
- Edit the seeded template «Дебют і Перші кроки — медаль кожному». «Нагородження» lists Дебют, Перші кроки and Професійна ліга, with the first two checked.
- Uncheck «Перші кроки», save, reopen. It stays unchecked.

- [ ] **Step 7: Stop — do not commit.**

---

### Task 7: Frontend — awards block with manual editing above the program

**Files:**
- Create: `frontend/src/lib/awards.constants.ts`
- Create: `frontend/src/lib/awards.types.ts`
- Create: `frontend/src/lib/awards.ts`
- Create: `frontend/src/components/awards/AwardsSummary.constants.ts`
- Create: `frontend/src/components/awards/AwardsSummary.module.css`
- Create: `frontend/src/components/awards/AwardLineRow.tsx`
- Create: `frontend/src/components/awards/AwardsSummary.tsx`
- Modify: `frontend/src/pages/SchedulePage.tsx`

**Interfaces:**
- Consumes: the three awards endpoints (Task 5); `ApiError`, `apiRequest` (`lib/http.ts`); `getStoredAdmin` (`lib/auth.ts`).
- Produces: `getAwardsReport(id)`, `setAwardSystem(id, awardSystem)`, `setAwardOverride(id, key, value)`, all returning `Promise<AwardsReport>`; components `AwardsSummary({ competitionId })` and `AwardLineRow({ line, label, disabled, onSave })`.

- [ ] **Step 1: Create `lib/awards.constants.ts`**

```ts
export const AWARD_SYSTEM = {
  STANDARD: 'standard',
  MEDAL_STANDINGS: 'medal_standings',
} as const;

export const AWARD_LINE_KIND = {
  FIRST_PLACE_MEDALS: 'first_place_medals',
  SECOND_PLACE_MEDALS: 'second_place_medals',
  THIRD_PLACE_MEDALS: 'third_place_medals',
  PARTICIPATION_MEDALS: 'participation_medals',
  CUPS: 'cups',
  DIPLOMAS: 'diplomas',
  SPECIAL_WINNERS: 'special_winners',
  SPECIAL_PARTICIPATIONS: 'special_participations',
} as const;

export const SPECIAL_LINE_KINDS: readonly string[] = [
  AWARD_LINE_KIND.SPECIAL_WINNERS,
  AWARD_LINE_KIND.SPECIAL_PARTICIPATIONS,
];

export const MIN_AWARD_QUANTITY = 0;
export const AWARD_QUANTITY_STEP = 1;
export const HTTP_FORBIDDEN = 403;
```

- [ ] **Step 2: Create `lib/awards.types.ts`**

```ts
import type { AWARD_LINE_KIND, AWARD_SYSTEM } from './awards.constants';

export type AwardSystem = (typeof AWARD_SYSTEM)[keyof typeof AWARD_SYSTEM];
export type AwardLineKind =
  (typeof AWARD_LINE_KIND)[keyof typeof AWARD_LINE_KIND];

export interface AwardLine {
  key: string;
  kind: AwardLineKind;
  subject: string | null;
  calculated: number;
  override: number | null;
}

export interface AwardsReport {
  awardSystem: AwardSystem;
  performancesInProgram: number;
  lines: AwardLine[];
}
```

- [ ] **Step 3: Create `lib/awards.ts`**

```ts
import { apiRequest } from './http';
import type { AwardSystem, AwardsReport } from './awards.types';

export function getAwardsReport(competitionId: string): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(`/competitions/${competitionId}/awards`);
}

export function setAwardSystem(
  competitionId: string,
  awardSystem: AwardSystem,
): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(
    `/competitions/${competitionId}/awards/system`,
    { method: 'PATCH', body: JSON.stringify({ awardSystem }) },
  );
}

// value: null resets the line to the calculated quantity.
export function setAwardOverride(
  competitionId: string,
  key: string,
  value: number | null,
): Promise<AwardsReport> {
  return apiRequest<AwardsReport>(
    `/competitions/${competitionId}/awards/overrides`,
    { method: 'PATCH', body: JSON.stringify({ key, value }) },
  );
}
```

- [ ] **Step 4: Create `AwardsSummary.constants.ts`**

```ts
import { AWARD_LINE_KIND } from '../../lib/awards.constants';
import type { AwardLineKind } from '../../lib/awards.types';

export const AWARDS_TITLE = 'Нагородна продукція';
export const AWARDS_SUBTITLE =
  'Пораховано з номерів, розставлених у програмі. Будь-яку кількість можна виправити вручну. Блок бачать лише організатори й адміністратори.';
export const MEDAL_STANDINGS_LABEL =
  'Медальний залік — медалі за 1–3 місця розподіляються на всі номери кожної категорії (крім групових і спеціальних)';
export const LOADING_LABEL = 'Рахуємо нагороди…';
export const EMPTY_PROGRAM_LABEL = 'У програмі ще немає номерів.';
export const LOAD_ERROR = 'Не вдалося порахувати нагороди.';
export const SAVE_ERROR = 'Не вдалося зберегти зміну.';
export const PERFORMANCES_LABEL = 'Номерів у програмі';
export const SPECIALS_TITLE = 'Спеціальні номінації';
export const CUP_LABEL_PREFIX = 'Кубок';
export const SAVE_LABEL = 'Зберегти';
export const RESET_LABEL = 'Скинути';
export const CALCULATED_PREFIX = 'розраховано:';

export const AWARD_LINE_LABELS: Record<AwardLineKind, string> = {
  [AWARD_LINE_KIND.FIRST_PLACE_MEDALS]: 'Медалі за 1 місце',
  [AWARD_LINE_KIND.SECOND_PLACE_MEDALS]: 'Медалі за 2 місце',
  [AWARD_LINE_KIND.THIRD_PLACE_MEDALS]: 'Медалі за 3 місце',
  [AWARD_LINE_KIND.PARTICIPATION_MEDALS]: 'Медалі за участь (групи)',
  [AWARD_LINE_KIND.CUPS]: 'Кубки',
  [AWARD_LINE_KIND.DIPLOMAS]: 'Дипломи',
  [AWARD_LINE_KIND.SPECIAL_WINNERS]: '1 місце',
  [AWARD_LINE_KIND.SPECIAL_PARTICIPATIONS]: 'Участей',
};
```

- [ ] **Step 5: Create `AwardsSummary.module.css`**

```css
.panel {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  background: var(--accent-soft, #eef2ff);
  margin-bottom: 1.5rem;
}

.title {
  margin: 0 0 0.25rem;
  font-size: 1.1rem;
}

.subtitle {
  margin: 0 0 0.75rem;
  color: var(--text-muted, #667085);
  font-size: 0.85rem;
}

.error {
  margin: 0 0 0.75rem;
  color: var(--danger, #b42318);
}

.toggle {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.lines {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  background: var(--surface, #fff);
}

.label {
  flex: 1 1 200px;
}

.input {
  width: 6rem;
  padding: 0.3rem 0.5rem;
  font-weight: 700;
}

.inputOverridden {
  border-color: var(--accent, #4f46e5);
}

.hint {
  color: var(--text-muted, #667085);
  font-size: 0.8rem;
}

.button {
  padding: 0.3rem 0.7rem;
  cursor: pointer;
}

.linkButton {
  padding: 0;
  border: 0;
  background: none;
  color: var(--accent, #4f46e5);
  cursor: pointer;
  font-size: 0.8rem;
}

.subTitle {
  margin: 1rem 0 0.5rem;
  font-size: 0.95rem;
}
```

- [ ] **Step 6: Create `AwardLineRow.tsx`**

```tsx
import { useState } from 'react';
import {
  AWARD_QUANTITY_STEP,
  MIN_AWARD_QUANTITY,
} from '../../lib/awards.constants';
import type { AwardLine } from '../../lib/awards.types';
import {
  CALCULATED_PREFIX,
  RESET_LABEL,
  SAVE_LABEL,
} from './AwardsSummary.constants';
import styles from './AwardsSummary.module.css';

interface AwardLineRowProps {
  line: AwardLine;
  label: string;
  disabled: boolean;
  onSave: (key: string, value: number | null) => void;
}

// The parent keys this row on key + override + calculated, so a fresh
// report remounts it with a fresh draft — no state syncing effect.
export default function AwardLineRow({
  line,
  label,
  disabled,
  onSave,
}: AwardLineRowProps) {
  const shown = line.override ?? line.calculated;
  const [draft, setDraft] = useState(String(shown));

  const parsed = Number(draft);
  const valid =
    draft.trim() !== '' &&
    Number.isInteger(parsed) &&
    parsed >= MIN_AWARD_QUANTITY;
  const dirty = valid && parsed !== shown;
  const overridden = line.override !== null;

  return (
    <div className={styles.row}>
      <span className={styles.label}>{label}</span>
      <input
        type="number"
        min={MIN_AWARD_QUANTITY}
        step={AWARD_QUANTITY_STEP}
        aria-label={label}
        className={`${styles.input} ${overridden ? styles.inputOverridden : ''}`}
        value={draft}
        disabled={disabled}
        onChange={(e) => setDraft(e.target.value)}
      />
      {dirty && (
        <button
          type="button"
          className={styles.button}
          disabled={disabled}
          onClick={() => onSave(line.key, parsed)}
        >
          {SAVE_LABEL}
        </button>
      )}
      {overridden && (
        <>
          <span className={styles.hint}>
            {CALCULATED_PREFIX} {line.calculated}
          </span>
          <button
            type="button"
            className={styles.linkButton}
            disabled={disabled}
            onClick={() => onSave(line.key, null)}
          >
            {RESET_LABEL}
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Create `AwardsSummary.tsx`**

```tsx
import { useEffect, useState } from 'react';
import {
  getAwardsReport,
  setAwardOverride,
  setAwardSystem,
} from '../../lib/awards';
import {
  AWARD_LINE_KIND,
  AWARD_SYSTEM,
  HTTP_FORBIDDEN,
  SPECIAL_LINE_KINDS,
} from '../../lib/awards.constants';
import type { AwardLine, AwardsReport } from '../../lib/awards.types';
import { ApiError } from '../../lib/http';
import AwardLineRow from './AwardLineRow';
import {
  AWARD_LINE_LABELS,
  AWARDS_SUBTITLE,
  AWARDS_TITLE,
  CUP_LABEL_PREFIX,
  EMPTY_PROGRAM_LABEL,
  LOAD_ERROR,
  LOADING_LABEL,
  MEDAL_STANDINGS_LABEL,
  PERFORMANCES_LABEL,
  SAVE_ERROR,
  SPECIALS_TITLE,
} from './AwardsSummary.constants';
import styles from './AwardsSummary.module.css';

interface AwardsSummaryProps {
  competitionId: string;
}

function labelOf(line: AwardLine): string {
  return line.kind === AWARD_LINE_KIND.CUPS
    ? `${CUP_LABEL_PREFIX} «${line.subject}»`
    : AWARD_LINE_LABELS[line.kind];
}

function rowKeyOf(line: AwardLine): string {
  return `${line.key}|${line.override}|${line.calculated}`;
}

// Staff-only: the server decides. An organizer who is not on this
// competition's team gets 403, and the block quietly disappears.
export default function AwardsSummary({ competitionId }: AwardsSummaryProps) {
  const [report, setReport] = useState<AwardsReport | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAwardsReport(competitionId)
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === HTTP_FORBIDDEN) {
          setForbidden(true);
        } else {
          setError(LOAD_ERROR);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId]);

  const save = (request: Promise<AwardsReport>) => {
    setSaving(true);
    setError(null);
    request
      .then(setReport)
      .catch(() => setError(SAVE_ERROR))
      .finally(() => setSaving(false));
  };

  const toggleMedalStandings = (checked: boolean) =>
    save(
      setAwardSystem(
        competitionId,
        checked ? AWARD_SYSTEM.MEDAL_STANDINGS : AWARD_SYSTEM.STANDARD,
      ),
    );

  const saveOverride = (key: string, value: number | null) =>
    save(setAwardOverride(competitionId, key, value));

  if (forbidden) return null;

  const generalLines =
    report?.lines.filter((l) => !SPECIAL_LINE_KINDS.includes(l.kind)) ?? [];
  const specialLines =
    report?.lines.filter((l) => SPECIAL_LINE_KINDS.includes(l.kind)) ?? [];
  const specialNames = [
    ...new Set(specialLines.map((l) => l.subject ?? '')),
  ];

  return (
    <section className={styles.panel}>
      <h2 className={styles.title}>{AWARDS_TITLE}</h2>
      <p className={styles.subtitle}>{AWARDS_SUBTITLE}</p>
      {error && <p className={styles.error}>{error}</p>}
      {!report && !error && <p className={styles.subtitle}>{LOADING_LABEL}</p>}

      {report && (
        <>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={report.awardSystem === AWARD_SYSTEM.MEDAL_STANDINGS}
              disabled={saving}
              onChange={(e) => toggleMedalStandings(e.target.checked)}
            />
            {MEDAL_STANDINGS_LABEL}
          </label>

          {report.performancesInProgram === 0 ? (
            <p className={styles.subtitle}>{EMPTY_PROGRAM_LABEL}</p>
          ) : (
            <>
              <p className={styles.subtitle}>
                {PERFORMANCES_LABEL}: {report.performancesInProgram}
              </p>
              <div className={styles.lines}>
                {generalLines.map((line) => (
                  <AwardLineRow
                    key={rowKeyOf(line)}
                    line={line}
                    label={labelOf(line)}
                    disabled={saving}
                    onSave={saveOverride}
                  />
                ))}
              </div>

              {specialNames.length > 0 && (
                <>
                  <h3 className={styles.subTitle}>{SPECIALS_TITLE}</h3>
                  {specialNames.map((name) => (
                    <div key={name} className={styles.lines}>
                      <strong>{name}</strong>
                      {specialLines
                        .filter((line) => line.subject === name)
                        .map((line) => (
                          <AwardLineRow
                            key={rowKeyOf(line)}
                            line={line}
                            label={labelOf(line)}
                            disabled={saving}
                            onSave={saveOverride}
                          />
                        ))}
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Render on `SchedulePage.tsx`**

Imports:

```tsx
import AwardsSummary from '../components/awards/AwardsSummary';
import { getStoredAdmin } from '../lib/auth';
```

After `const { id } = useParams<{ id: string }>();`:

```tsx
  // Organizer-level session; the awards endpoint itself checks this
  // competition's team (owner / team admin / global admin).
  const staff = getStoredAdmin();
```

In the main return, directly after `<p className={styles.subtitle}>…</p>`:

```tsx
      {id && staff && <AwardsSummary competitionId={id} />}
```

- [ ] **Step 9: Verify**

Run: `cd frontend && npm run build && npm run lint`. Expected: clean.
Manual on `/competitions/:id/schedule`:
- **As the owner:** «Нагородна продукція» sits above the program and shows the lines.
  - Change «Дипломи» to 100, then «Зберегти». The field is highlighted, «розраховано: N» appears, and after a reload it's still 100.
  - «Скинути» brings back N.
  - Tick «Медальний залік». Place medals are recalculated, and manual values are kept.
  - Special nominations show under their bare name, each with «1 місце» and «Участей».
- **As a team admin, and as a global admin:** you can edit.
- **Logged out, as a participant, or as an organizer of a different competition:** no block, no error.

- [ ] **Step 10: Stop — do not commit.**

---

### Task 8: «Цифри конкурсу» on the public competition page

> **Assumption:** «цікавинки» wasn't specified. This task implements aggregate numbers only: participants, numbers, studios, cities, nominations and the lineup breakdown. Confirm or replace it before executing. Tasks 1–7 don't depend on it.

**Files:**
- Create: `backend/src/entries/entry-stats.interface.ts`
- Create: `backend/src/entries/build-entry-stats.ts`
- Modify: `backend/src/entries/entries.constants.ts`
- Modify: `backend/src/entries/entries.service.ts`
- Modify: `backend/src/entries/entries.controller.ts`
- Create: `frontend/src/lib/entryStats.types.ts`
- Modify: `frontend/src/lib/entries.ts`
- Create: `frontend/src/components/CompetitionFacts.constants.ts`
- Create: `frontend/src/components/CompetitionFacts.module.css`
- Create: `frontend/src/components/CompetitionFacts.tsx`
- Modify: `frontend/src/pages/PublicCompetitionPage.tsx`

**Interfaces:**
- Consumes: `MIN_PARTICIPANTS_PER_ENTRY` (Task 4; if Task 8 runs first, add that constant as in Task 4 Step 1).
- Produces: public `GET /competitions/:competitionId/entries/stats` returns `EntryStats { performances; participants; studios; cities; nominations; lineups: LineupCount[] }`; `getEntryStats(id)`; component `CompetitionFacts({ stats })`.

- [ ] **Step 1: Append to `entries.constants.ts`**

```ts
// Public stats read every entry of one competition, capped for safety.
export const MAX_ENTRY_STATS_ROWS = 10000;
export const ENTRY_STATS_ATTRIBUTES: string[] = [
  'participantIds',
  'participantsCount',
  'studioName',
  'city',
  'nominationId',
  'nomination',
  'lineup',
];
```

- [ ] **Step 2: Create `entry-stats.interface.ts`**

```ts
export interface LineupCount {
  label: string;
  count: number;
}

export interface EntryStats {
  performances: number;
  participants: number;
  studios: number;
  cities: number;
  nominations: number;
  lineups: LineupCount[];
}
```

- [ ] **Step 3: Create `build-entry-stats.ts`**

```ts
import { MIN_PARTICIPANTS_PER_ENTRY } from './entries.constants';
import type { Entry } from './entry.model';
import type { EntryStats } from './entry-stats.interface';

function addDistinct(values: Set<string>, raw: string | null): void {
  const value = raw?.trim().toLowerCase();
  if (value) values.add(value);
}

// Aggregate-only numbers for the public page — no names are exposed.
// Studios and cities are compared case-insensitively.
export function buildEntryStats(entries: Entry[]): EntryStats {
  const dancers = new Set<string>();
  let dancersWithoutAccount = 0;
  const studios = new Set<string>();
  const cities = new Set<string>();
  const nominations = new Set<string>();
  const lineups = new Map<string, number>();

  for (const entry of entries) {
    const participantIds = entry.participantIds ?? [];
    if (participantIds.length > 0) {
      for (const id of participantIds) dancers.add(id);
    } else {
      dancersWithoutAccount +=
        entry.participantsCount ?? MIN_PARTICIPANTS_PER_ENTRY;
    }
    addDistinct(studios, entry.studioName);
    addDistinct(cities, entry.city);
    nominations.add(entry.nominationId ?? entry.nomination);
    if (entry.lineup) {
      lineups.set(entry.lineup, (lineups.get(entry.lineup) ?? 0) + 1);
    }
  }

  return {
    performances: entries.length,
    participants: dancers.size + dancersWithoutAccount,
    studios: studios.size,
    cities: cities.size,
    nominations: nominations.size,
    lineups: [...lineups].map(([label, count]) => ({ label, count })),
  };
}
```

- [ ] **Step 4: Service method** in `entries.service.ts`, directly after `count()`

Add `ENTRY_STATS_ATTRIBUTES, MAX_ENTRY_STATS_ROWS` to the existing `./entries.constants` import. Add `import { buildEntryStats } from './build-entry-stats';` and `import type { EntryStats } from './entry-stats.interface';`.

```ts
  async stats(competitionId: string): Promise<EntryStats> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      attributes: ENTRY_STATS_ATTRIBUTES,
      limit: MAX_ENTRY_STATS_ROWS,
    });
    return buildEntryStats(entries);
  }
```

- [ ] **Step 5: Controller route** in `entries.controller.ts`, directly after the `count` handler

```ts
  @ApiOperation({
    summary: "Public — aggregate numbers about a competition's entries",
    description:
      'No login required. Counts only — no names, studios or cities are listed.',
  })
  @ApiResponse({ status: 200, description: 'Stats returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Public()
  @Get('stats')
  stats(@Param('competitionId') competitionId: string) {
    return this.entriesService.stats(competitionId);
  }
```

- [ ] **Step 6: Backend verify**

Run: `cd backend && npx tsc --noEmit && npm run lint`. Expected: clean.
Manual: `GET /competitions/<id>/entries/stats` with no token returns 200 with `EntryStats`. With an unknown uuid it returns 404.

- [ ] **Step 7: Create `frontend/src/lib/entryStats.types.ts`**

```ts
export interface LineupCount {
  label: string;
  count: number;
}

export interface EntryStats {
  performances: number;
  participants: number;
  studios: number;
  cities: number;
  nominations: number;
  lineups: LineupCount[];
}
```

- [ ] **Step 8: Add `getEntryStats` to `frontend/src/lib/entries.ts`** (after `getEntriesCount`; add `import type { EntryStats } from './entryStats.types';`)

```ts
export function getEntryStats(competitionId: string): Promise<EntryStats> {
  return publicRequest<EntryStats>(
    `/competitions/${competitionId}/entries/stats`,
  );
}
```

- [ ] **Step 9: Create `CompetitionFacts.constants.ts`**

```ts
export const FACTS_TITLE = 'Цифри конкурсу';
export const PARTICIPANTS_LABEL = 'Учасників';
export const PERFORMANCES_LABEL = 'Номерів';
export const STUDIOS_LABEL = 'Студій';
export const CITIES_LABEL = 'Міст';
export const NOMINATIONS_LABEL = 'Номінацій';
```

- [ ] **Step 10: Create `CompetitionFacts.module.css`**

```css
.section {
  padding: 24px 0;
  border-top: 1px solid var(--g-line);
}

.title {
  margin: 0 0 14px;
  color: var(--g-accent);
  font-size: 12.5px;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 12px;
}

.tile {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--g-field);
  text-align: center;
}

.value {
  font-size: 26px;
  font-weight: 800;
  color: var(--g-accent);
}

.label {
  color: var(--g-muted);
  font-size: 13px;
}
```

- [ ] **Step 11: Create `CompetitionFacts.tsx`**

```tsx
import type { EntryStats } from '../lib/entryStats.types';
import {
  CITIES_LABEL,
  FACTS_TITLE,
  NOMINATIONS_LABEL,
  PARTICIPANTS_LABEL,
  PERFORMANCES_LABEL,
  STUDIOS_LABEL,
} from './CompetitionFacts.constants';
import styles from './CompetitionFacts.module.css';

interface CompetitionFactsProps {
  stats: EntryStats;
}

export default function CompetitionFacts({ stats }: CompetitionFactsProps) {
  const facts = [
    { label: PARTICIPANTS_LABEL, value: stats.participants },
    { label: PERFORMANCES_LABEL, value: stats.performances },
    { label: STUDIOS_LABEL, value: stats.studios },
    { label: CITIES_LABEL, value: stats.cities },
    { label: NOMINATIONS_LABEL, value: stats.nominations },
    ...stats.lineups.map((lineup) => ({
      label: lineup.label,
      value: lineup.count,
    })),
  ].filter((fact) => fact.value > 0);

  return (
    <section className={styles.section}>
      <h2 className={styles.title}>{FACTS_TITLE}</h2>
      <div className={styles.grid}>
        {facts.map((fact) => (
          <div key={fact.label} className={styles.tile}>
            <div className={styles.value}>{fact.value}</div>
            <div className={styles.label}>{fact.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 12: Render on `PublicCompetitionPage.tsx`**

Replace `import { getEntriesCount } from '../lib/entries';` with:

```tsx
import CompetitionFacts from '../components/CompetitionFacts';
import { getEntriesCount, getEntryStats } from '../lib/entries';
import type { EntryStats } from '../lib/entryStats.types';
```

State, after `entriesCount`:

```tsx
  const [stats, setStats] = useState<EntryStats | null>(null);
```

In the effect, after the `getEntriesCount(id)` chain:

```tsx
    getEntryStats(id)
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        /* facts are optional — leave the block hidden on failure */
      });
```

Render, directly after `<CompetitionDetails … />`:

```tsx
              {stats && stats.performances > 0 && (
                <CompetitionFacts stats={stats} />
              )}
```

- [ ] **Step 13: Frontend verify**

Run: `cd frontend && npm run build && npm run lint`. Expected: clean.
Manual, logged out, `/competitions/:id`:
- A competition with entries shows «Цифри конкурсу» with non-zero tiles only.
- A competition without entries shows no block.

- [ ] **Step 14: Stop — do not commit.**

---

## Execution order & dependencies

`1 → 2 → 3 → 4 → 5 → 6 → 7`; `8` is independent apart from the `MIN_PARTICIPANTS_PER_ENTRY` constant (Task 4 Step 1).
