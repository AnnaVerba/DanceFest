# Improvisation Flag on Style — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** make «this exit is an improvisation» a single derived fact, coming from a flag on the style, so improvisations (including the one inside «Корона») run and show the competition's improvisation duration.

**Architecture:** `categories.isImprovisation` (styles only) is the one source of truth. `planNominationExits` derives `isImprovisation` per exit; the nomination flag and `entries.improv` are derived from it on the server. `entries.improv` stays as a server-written copy the schedule, tracks and music export read. Release 1 stops using `allowsImprovisation`; release 2 drops the columns.

**Tech Stack:** NestJS + sequelize-typescript (backend), sequelize-cli TS migrations, React + TanStack Query (frontend).

**Spec:** `docs/superpowers/specs/2026-09-29-improvisation-flag-on-style-design.md` (read it first, including «Admin display…» and «Release safety»).

## Global Constraints

- Project rules (CLAUDE.md): constants and types in separate files; no magic numbers/strings; no functions passed as parameters; no new tests unless the Developer asks; **no commits unless the Developer asks**.
- Verification after each task: backend `npx tsc --noEmit -p tsconfig.json` (in `backend/`), frontend `npx tsc -b` (in `frontend/`; plain `tsc --noEmit` checks nothing there). No eslint/Playwright/screenshots unless asked.
- Participants and organizers apply and configure nominations exactly as today; organizers get no new step.
- Release 1 must not drop `nominations.allowsImprovisation` / `template_nominations.allowsImprovisation`; it only stops reading and writing them.
- An existing test file whose fixtures stop compiling is updated minimally so it compiles (that is maintenance, not new tests).

## Review Focus

1. A `per_program` special nomination with one improvisation style and one timed style («Корона»): exits must differ — improvisation exit `isImprovisation: true, durationLimitSeconds: null`, the other keeps its limit.
2. A nomination with **no** style: never an improvisation (the rule requires at least one style).
3. An admin flips a style that is used in several competitions: every competition's nominations and entries are resynced, each with its own rules.
4. An entry whose `program` text no longer matches any style of its nomination (renamed style): recompute sets `improv = false`; accepted risk per spec, must not throw.
5. Entries an admin had marked `improv` by hand in a regular nomination: the migration recomputes them from styles. This is intended (derived flag), mention it in the release notes to the Developer.

---

### Task 1: Style flag in the database and the category model

**Files:**
- Create: `backend/migrations/20260930090000-add-is-improvisation-to-categories.ts`
- Modify: `backend/src/categories/category.model.ts` (after `description`, ~line 79)
- Modify: `backend/src/categories/categories.service.ts:236-247` (`toDto`)

**Interfaces:**
- Produces: `Category.isImprovisation: boolean`; category DTOs carry `isImprovisation`.

- [ ] **Step 1: Write the migration**

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Імпровізація — властивість стилю, однакова для всіх конкурсів. Прапорець
// переїжджає зі спільної для номінацій колонки на рядок стилю, а
// entries.improv стає похідною копією, яку пише лише сервер.
//
// Колонки nominations/template_nominations.allowsImprovisation лишаються
// (нікому не потрібні) — їх прибирає окрема міграція наступного релізу.
const TABLE = 'categories';
const COLUMN = 'isImprovisation';
const IMPROVISATION_NAME_PATTERN = 'імпровіз%';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // Назва — лише тут, один раз: далі джерело правди — прапорець.
    await queryInterface.sequelize.query(
      `UPDATE categories c
          SET "isImprovisation" = true
        WHERE c.type = 'style'
          AND (
            lower(c.name) LIKE :pattern
            OR c.id IN (
              SELECT nc."categoryId"
                FROM nomination_categories nc
                JOIN nominations n ON n.id = nc."nominationId"
               WHERE n."allowsImprovisation" = true)
            OR c.id IN (
              SELECT tnc."categoryId"
                FROM template_nomination_categories tnc
                JOIN template_nominations tn ON tn.id = tnc."templateNominationId"
               WHERE tn."allowsImprovisation" = true)
          )`,
      { replacements: { pattern: IMPROVISATION_NAME_PATTERN } },
    );

    // Те саме правило, що planNominationExits: per_program — стиль програми
    // заявки; інакше — у номінації є стиль і всі її стилі імпровізаційні.
    await queryInterface.sequelize.query(
      `UPDATE entries e
          SET improv = CASE
            WHEN n."exitMode" = 'per_program' AND EXISTS (
                SELECT 1 FROM nomination_categories nc
                  JOIN categories c ON c.id = nc."categoryId"
                 WHERE nc."nominationId" = n.id AND c.type = 'style')
              THEN EXISTS (
                SELECT 1 FROM nomination_categories nc
                  JOIN categories c ON c.id = nc."categoryId"
                 WHERE nc."nominationId" = n.id AND c.type = 'style'
                   AND c.name = e.program AND c."isImprovisation")
            ELSE EXISTS (
                SELECT 1 FROM nomination_categories nc
                  JOIN categories c ON c.id = nc."categoryId"
                 WHERE nc."nominationId" = n.id AND c.type = 'style')
              AND NOT EXISTS (
                SELECT 1 FROM nomination_categories nc
                  JOIN categories c ON c.id = nc."categoryId"
                 WHERE nc."nominationId" = n.id AND c.type = 'style'
                   AND NOT c."isImprovisation")
          END
         FROM nominations n
        WHERE n.id = e."nominationId"`,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
  },
};
```

- [ ] **Step 2: Add the model field** in `category.model.ts`, right after the `description` column:

```ts
  // Лише для стилю: виступ у цьому стилі — імпровізація (без треку, час з
  // таймінгів). Спільний для всіх конкурсів, як і description.
  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare isImprovisation: boolean;
```

- [ ] **Step 3: Expose it** in `CategoriesService.toDto`: add `isImprovisation: category.isImprovisation,` after `description`.

- [ ] **Step 4: Verify** — `cd backend && npx tsc --noEmit -p tsconfig.json` → exit 0.

---

### Task 2: Derivation rule in exits and nominations

**Files:**
- Create: `backend/src/nominations/is-improvisation-nomination.ts`
- Create: `backend/src/nominations/recompute-entries-improv.sql.ts`
- Modify: `backend/src/nominations/nomination-exits.ts`
- Modify: `backend/src/nominations/nomination-exits.spec.ts` (fixtures only: add `isImprovisation: false` to every program literal so it compiles)
- Modify: `backend/src/nominations/nominations.service.ts` (`programsFor` ~1412, `toDto` ~1492, `toAttributes` ~1150, `applyAutoDuration` ~1164, `reapplyAutoDurations` ~1212, `autoDurationSeconds` ~1235, `leagueNamesById` ~1251, `update` ~551-613, remove `bulkSetImprovisation` ~660-719 and `syncEntriesImprovisation` ~1197)
- Modify: `backend/src/nominations/nominations.controller.ts` (remove the `bulk-improvisation` route ~290-310 and the `BulkSetImprovisationDto` import)
- Delete: `backend/src/nominations/dto/bulk-set-improvisation.dto.ts`
- Modify: `backend/src/nominations/dto/create-nomination.dto.ts:47-52` (remove `allowsImprovisation`)
- Modify: `backend/src/nominations/nomination.model.ts:53` (remove `allowsImprovisation` attribute; the column stays in the DB)
- Modify: `backend/src/competition-rules/competition-rules.service.ts:139-175` (`applyLeagueDurationChanges` filter)

**Interfaces:**
- Produces:
  - `NominationProgram { id: string; name: string; isImprovisation: boolean }`
  - `NominationExit { …; isImprovisation: boolean }`
  - `isImprovisationNomination(programs: NominationProgram[]): boolean`
  - `RECOMPUTE_ENTRIES_IMPROV_SQL` (bind `$1` = uuid[] of nomination ids)
  - `IMPROVISATION_NOMINATION_IDS_SQL` (subquery text, no params)
  - `NominationsService.resyncImprovisationForStyle(categoryId: string, transaction: Transaction): Promise<void>` (public)
  - Nomination DTO: `isImprovisation: boolean` replaces `allowsImprovisation`; `exits[].isImprovisation`.

- [ ] **Step 1: The rule** — `is-improvisation-nomination.ts`:

```ts
import type { NominationProgram } from './nomination-exits';

// A single-exit nomination is an improvisation when it has a style and every
// style is one. No style means no improvisation: nothing says so.
export function isImprovisationNomination(
  programs: NominationProgram[],
): boolean {
  return (
    programs.length > 0 && programs.every((program) => program.isImprovisation)
  );
}
```

- [ ] **Step 2: Exits** — in `nomination-exits.ts` add `isImprovisation: boolean` to `NominationProgram` and `NominationExit`; in `planNominationExits`:

```ts
  if (exitMode === 'per_program' && programs.length > 0) {
    return programs.map((program) => ({
      programId: program.id,
      programName: program.name,
      label: buildNominationLabel({ axisNames: [label], programName: program.name }),
      isImprovisation: program.isImprovisation,
      // An improvisation runs for the competition's improvisation duration.
      durationLimitSeconds: program.isImprovisation
        ? null
        : (programLimits[program.id] ?? durationLimitSeconds ?? null),
    }));
  }

  const isImprovisation = isImprovisationNomination(programs);
  return [
    {
      programId: null,
      programName: null,
      label,
      isImprovisation,
      durationLimitSeconds: isImprovisation
        ? null
        : (durationLimitSeconds ?? sumProgramLimits(programs, programLimits)),
    },
  ];
```

(import `isImprovisationNomination` from `./is-improvisation-nomination`; the cyclic type-only import is fine.) Add `isImprovisation: false` to every program object in `nomination-exits.spec.ts`.

- [ ] **Step 3: SQL constants** — `recompute-entries-improv.sql.ts`:

```ts
// Styles of a nomination, as an SQL fragment shared by the queries below.
const STYLES_OF = (nominationRef: string) => `
  SELECT 1 FROM nomination_categories nc
    JOIN categories c ON c.id = nc."categoryId"
   WHERE nc."nominationId" = ${nominationRef} AND c.type = 'style'`;

// entries.improv by the planNominationExits rule, for the nominations in $1.
export const RECOMPUTE_ENTRIES_IMPROV_SQL = `
  UPDATE entries e
     SET improv = CASE
       WHEN n."exitMode" = 'per_program' AND EXISTS (${STYLES_OF('n.id')})
         THEN EXISTS (${STYLES_OF('n.id')}
                AND c.name = e.program AND c."isImprovisation")
       ELSE EXISTS (${STYLES_OF('n.id')})
         AND NOT EXISTS (${STYLES_OF('n.id')} AND NOT c."isImprovisation")
     END
    FROM nominations n
   WHERE n.id = e."nominationId" AND n.id = ANY($1::uuid[])`;

// Ids of nominations that are improvisations as a whole (isImprovisationNomination).
export const IMPROVISATION_NOMINATION_IDS_SQL = `
  (SELECT n.id FROM nominations n
    WHERE EXISTS (${STYLES_OF('n.id')})
      AND NOT EXISTS (${STYLES_OF('n.id')} AND NOT c."isImprovisation"))`;
```

(`STYLES_OF` is a module-private string builder, not a parameter passed around — fine under the project rules.)

- [ ] **Step 4: Nominations service — derived flag**
  - `programsFor`: map `isImprovisation: c.isImprovisation`.
  - `toDto`: replace `allowsImprovisation: nomination.allowsImprovisation` with `isImprovisation: isImprovisationNomination(this.programsFor(nomination, categories))`.
  - `toAttributes` (~1150): delete the `allowsImprovisation` line.
  - Replace `leagueNamesById` with a loader of all axis categories:

```ts
  // category id -> category, in one query for any number of nominations.
  private async categoriesById(
    categoryIds: string[],
  ): Promise<Map<string, Category>> {
    if (categoryIds.length === 0) return new Map();
    const categories = await this.categoryModel.findAll({
      where: { id: { [Op.in]: [...new Set(categoryIds)] } },
    });
    return new Map(categories.map((category) => [category.id, category]));
  }
```

  - `autoDurationSeconds(categoryIds: string[], categories: Map<string, Category>, rules)`:

```ts
  // TASK-07's rule: an improvisation has no duration of its own (the
  // schedule takes the competition's improvisation duration), a regular
  // nomination runs for its league's.
  private autoDurationSeconds(
    categoryIds: string[],
    categories: Map<string, Category>,
    rules: CompetitionRule,
  ): number | null {
    const axes = categoryIds
      .map((id) => categories.get(id))
      .filter((c): c is Category => c !== undefined);
    const programs = axes
      .filter((c) => c.type === STYLE_CATEGORY_TYPE)
      .map((c) => ({ id: c.id, name: c.name, isImprovisation: c.isImprovisation }));
    if (isImprovisationNomination(programs)) return null;
    const league = axes.find((c) => c.type === LEAGUE_CATEGORY_TYPE);
    return resolveLeagueDurationSeconds(rules.leagueLimits, league?.name ?? null);
  }
```

  `STYLE_CATEGORY_TYPE`: add `export const STYLE_CATEGORY_TYPE: CategoryType = 'style';` to `categories/category.model.ts` next to the other `*_CATEGORY_TYPE` constants if it is not there, and use it in `programsFor` instead of the `'style'` literal.
  - `applyAutoDuration`: input type drops `allowsImprovisation`; body after the override check:

```ts
    attributes.durationOverridden = false;
    const effectiveRules =
      rules ?? (await this.competitionRulesService.getRules(competitionId));
    const categoryIds = input.categoryIds ?? [];
    attributes.durationLimitSeconds = this.autoDurationSeconds(
      categoryIds,
      await this.categoriesById(categoryIds),
      effectiveRules,
    );
```

  - `reapplyAutoDurations`: `const categories = await this.categoriesById(automatic.flatMap((n) => n.categoryIds));` and `nomination.durationLimitSeconds = this.autoDurationSeconds(nomination.categoryIds, categories, rules);`.

- [ ] **Step 5: Nominations service — `update`**
  - Delete `wasImprovisation`, the `dto.allowsImprovisation` block, the `allowsImprovisation !== wasImprovisation` reapply block (576-581) and the sync block inside the transaction (607-613).
  - Axes decide the flag now, so when `categoryIdsChanged` and `dto.durationLimitSeconds === undefined`: after the new links are saved and `nomination.categories` is reloaded (inside the transaction, after line 631), run

```ts
        if (dto.durationLimitSeconds === undefined) {
          await this.reapplyAutoDurations(competitionId, [nomination]);
          await nomination.save({ transaction });
        }
        await this.recomputeEntriesImprovisation([nomination.id], transaction);
```

  - Add the helper:

```ts
  // entries.improv is the server's copy of the exit's improvisation flag;
  // anything that changes a nomination's styles must refresh it.
  private async recomputeEntriesImprovisation(
    nominationIds: string[],
    transaction: Transaction,
  ): Promise<void> {
    if (nominationIds.length === 0) return;
    await this.nominationModel.sequelize!.query(RECOMPUTE_ENTRIES_IMPROV_SQL, {
      bind: [nominationIds],
      transaction,
    });
  }
```

- [ ] **Step 6: Style flip resync** (public, called by the categories module in Task 3):

```ts
  // A style's improvisation flag flipped: every nomination using it, in any
  // competition, re-derives its auto duration and its entries' improv.
  async resyncImprovisationForStyle(
    categoryId: string,
    transaction: Transaction,
  ): Promise<void> {
    const links = await this.nominationCategoryModel.findAll({
      where: { categoryId },
      attributes: ['nominationId'],
      transaction,
    });
    const ids = [...new Set(links.map((link) => link.nominationId))];
    if (ids.length === 0) return;

    const nominations = await this.nominationModel.findAll({
      where: { id: { [Op.in]: ids } },
      transaction,
    });
    await this.loadCategories(nominations);
    const byCompetition = new Map<string, Nomination[]>();
    for (const nomination of nominations) {
      const bucket = byCompetition.get(nomination.competitionId);
      if (bucket) bucket.push(nomination);
      else byCompetition.set(nomination.competitionId, [nomination]);
    }
    for (const [competitionId, group] of byCompetition) {
      const retimed = await this.reapplyAutoDurations(competitionId, group);
      for (const nomination of retimed) await nomination.save({ transaction });
    }
    await this.recomputeEntriesImprovisation(ids, transaction);
  }
```

- [ ] **Step 7: Remove the bulk route** — delete `bulkSetImprovisation` and `syncEntriesImprovisation` from the service, the controller route and its import, the DTO file, and `allowsImprovisation` from `CreateNominationDto` and `Nomination` model. Remove imports that become unused.

- [ ] **Step 8: League push excludes derived improvisations** — in `applyLeagueDurationChanges`, replace `allowsImprovisation: false,` with:

```ts
            [Op.and]: [
              { id: { [Op.notIn]: literal(IMPROVISATION_NOMINATION_IDS_SQL) } },
            ],
```

  (keep the existing `id: { [Op.in]: literal(...) }` key; the second id condition goes under `Op.and` because an object cannot hold `id` twice). Import `IMPROVISATION_NOMINATION_IDS_SQL` from `../nominations/recompute-entries-improv.sql`.

- [ ] **Step 9: Verify** — `cd backend && npx tsc --noEmit -p tsconfig.json` → exit 0. Grep: `grep -rn allowsImprovisation backend/src` must list only `category-templates/*` (Task 5) and nothing in `nominations/` or `competition-rules/`.

---

### Task 3: Admin endpoint to flip a style

**Files:**
- Create: `backend/src/categories/dto/update-category-improvisation.dto.ts`
- Modify: `backend/src/categories/categories.constants.ts` (new message)
- Modify: `backend/src/categories/categories.service.ts` (new method, constructor)
- Modify: `backend/src/categories/categories.controller.ts` (new route after `:id/description`)
- Modify: `backend/src/categories/categories.module.ts` (import `NominationsModule`)

**Interfaces:**
- Consumes: `NominationsService.resyncImprovisationForStyle(categoryId, transaction)` (Task 2), `STYLE_CATEGORY_TYPE` (Task 2).
- Produces: `PATCH /categories/:id/improvisation` body `{ isImprovisation: boolean }` → category DTO.

- [ ] **Step 1: DTO**

```ts
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCategoryImprovisationDto {
  @ApiProperty({
    example: true,
    description: 'Performances in this style are improvisations everywhere.',
  })
  @IsBoolean()
  isImprovisation: boolean;
}
```

- [ ] **Step 2: Constant** — `export const NOT_STYLE_CATEGORY_MESSAGE = 'Імпровізацією може бути лише стиль';`

- [ ] **Step 3: Service method** (inject `NominationsService` in the constructor):

```ts
  async updateImprovisation(id: string, dto: UpdateCategoryImprovisationDto) {
    const category = await this.findByIdOrFail(id);
    if (category.type !== STYLE_CATEGORY_TYPE) {
      throw new BadRequestException(NOT_STYLE_CATEGORY_MESSAGE);
    }
    if (category.isImprovisation === dto.isImprovisation) {
      return this.toDto(category);
    }
    await this.categoryModel.sequelize!.transaction(async (transaction) => {
      category.isImprovisation = dto.isImprovisation;
      await category.save({ transaction });
      await this.nominationsService.resyncImprovisationForStyle(
        category.id,
        transaction,
      );
    });
    return this.toDto(category);
  }
```

- [ ] **Step 4: Route** — copy the `:id/description` block's shape: `@UseGuards(JwtAuthGuard, MinLevelGuard) @MinLevel(AccessLevel.ADMIN) @Patch(':id/improvisation')`, summary «Mark a style as improvisation», responses 200/400 («Not a style.»)/401/403 («Only admins…»)/404.

- [ ] **Step 5: Module** — `imports: [SequelizeModule.forFeature([Category]), NominationsModule]`. `NominationsModule` does not import `CategoriesModule` (checked), so there is no cycle.

- [ ] **Step 6: Verify** — backend tsc → exit 0. Start the backend locally (`npm run start:dev`) and confirm it boots without a Nest dependency error.

---

### Task 4: Entries and tracks read the derived flag

**Files:**
- Modify: `backend/src/entries/entries.service.ts:634` (`buildRow`), `:853-857` and `:879` (`update`)
- Modify: `backend/src/entries/dto/create-entry.dto.ts:104-107` (remove `improv`)
- Modify: `backend/src/entries/dto/update-entry.dto.ts` (remove `improv` if declared there; it is a PartialType otherwise)
- Modify: `backend/src/tracks/is-improvisation-entry.ts`
- Modify: `backend/src/tracks/tracks.constants.ts:22` (remove `IMPROVISATION_PROGRAM_NAME_STEM`)

**Interfaces:**
- Consumes: `NominationExit.isImprovisation` (Task 2).

- [ ] **Step 1:** `buildRow`: `improv: exit.isImprovisation,`.
- [ ] **Step 2:** `update`: in the `nominationChanged` block add `changes.improv = exit.isImprovisation;`; delete line 879 (`if (dto.improv !== undefined) …`).
- [ ] **Step 3:** remove `improv` from `CreateEntryDto` (old clients sending it are stripped by `whitelist: true`).
- [ ] **Step 4:** `is-improvisation-entry.ts` becomes:

```ts
import type { Entry } from '../entries/entry.model';

// An improvisation has no track. entries.improv is derived by the server
// from the exit's style (see planNominationExits).
export function isImprovisationEntry(entry: Pick<Entry, 'improv'>): boolean {
  return entry.improv;
}
```

  and delete `IMPROVISATION_PROGRAM_NAME_STEM` from `tracks.constants.ts`.
- [ ] **Step 5: Verify** — backend tsc → exit 0.

---

### Task 4b: Several improvisations in one exit (Battle Queen)

Spec: «Several improvisations in one exit». An improvisation exit runs for improvisation duration × rounds; rounds = 1 for an entry with a `program` (per_program exit), otherwise the number of styles of its nomination (at least 1).

**Files:**
- Modify: `backend/src/competition-rules/limit-cache.ts` (new `rounds` map)
- Modify: `backend/src/competition-rules/competition-rules.service.ts` (new `improvisationRoundsOf`)
- Create: `backend/src/competition-rules/improvisation-rounds-input.interface.ts`
- Modify: `backend/src/schedule/performance-duration.ts` (`improvRounds` input)
- Modify: `backend/src/schedule/schedule.service.ts:1566-1584` (`durationOf`)

- [ ] **Step 1:** `LimitCache`: `// Improvisation rounds of a single-exit nomination: its style count.\n  readonly rounds = new Map<string, number>();`
- [ ] **Step 2:** input interface `ImprovisationRoundsInput { nominationId: string | null; program: string | null }`; service method:

```ts
  // How many improvisations one exit holds: a per_program exit is one
  // program; a single exit dances all of its nomination's styles in a row.
  async improvisationRoundsOf(
    entry: ImprovisationRoundsInput,
    limitCache: LimitCache = new LimitCache(),
  ): Promise<number> {
    if (entry.program !== null || entry.nominationId === null) {
      return MIN_IMPROVISATION_ROUNDS;
    }
    const cached = limitCache.rounds.get(entry.nominationId);
    if (cached !== undefined) return cached;
    const styles = await this.nominationCategoryModel.count({
      where: { nominationId: entry.nominationId },
      include: [{ model: Category, where: { type: STYLE_CATEGORY_TYPE }, required: true }],
    });
    const rounds = Math.max(styles, MIN_IMPROVISATION_ROUNDS);
    limitCache.rounds.set(entry.nominationId, rounds);
    return rounds;
  }
```

  (`MIN_IMPROVISATION_ROUNDS = 1` in `competition-rules.constants.ts`. If `NominationCategory` has no association to `Category` or isn't registered in `CompetitionRulesModule`, count with a raw query over `nomination_categories JOIN categories` instead — ledger the ruling.)
- [ ] **Step 3:** `performanceDuration`: `PerformanceDurationInput.improvRounds: number`; improv branch returns `(isGroupImprov ? group : individual) * input.improvRounds`.
- [ ] **Step 4:** `durationOf`: pass `improvRounds: entry.improv ? await this.rulesService.improvisationRoundsOf(entry, limitCache) : MIN_IMPROVISATION_ROUNDS`.
- [ ] **Step 5 (frontend, done in Task 7):** the admin display multiplies by rounds: single exit → `nomination.programs.length || 1`, per_program exit → 1.
- [ ] **Step 6: Verify** — backend tsc → exit 0.

---

### Task 5: Templates stop using the nomination flag

**Files:**
- Modify: `backend/src/category-templates/category-templates.service.ts:362, 451, 697`
- Modify: `backend/src/category-templates/dto/template-nomination.dto.ts:~25-30`
- Modify: `backend/src/category-templates/template-nomination.model.ts:~37-39`

- [ ] **Step 1:** delete the three `allowsImprovisation` lines in the service, the DTO property with its decorators, and the model attribute (the DB column stays until release 2).
- [ ] **Step 2: Verify** — backend tsc → exit 0; `grep -rn allowsImprovisation backend/src` → no output.

---

### Task 6: Frontend types and the style toggle

**Files:**
- Modify: `frontend/src/lib/categories.ts` (`Category.isImprovisation`, new `updateCategoryImprovisation`)
- Modify: `frontend/src/lib/nominations.ts` (`NominationProgram.isImprovisation`, `NominationExit.isImprovisation`, `Nomination.isImprovisation` replaces `allowsImprovisation`, drop it from `NominationInput`, delete `setImprovisationBulk`)
- Modify: `frontend/src/lib/entries.ts:39-40, 82` (drop `improv` from create input types; keep `improv` on the read type at 220)
- Create: `frontend/src/components/nominations/StyleImprovisationToggle.tsx`
- Create: `frontend/src/components/nominations/StyleImprovisationToggle.constants.ts`
- Modify: `frontend/src/components/nominations/NominationSetBuilder.tsx` (~562-571, chip buttons)

**Interfaces:**
- Produces: `updateCategoryImprovisation(id: string, isImprovisation: boolean): Promise<Category>`.

- [ ] **Step 1: API helper** (next to `updateCategoryDescription`):

```ts
export function updateCategoryImprovisation(
  id: string,
  isImprovisation: boolean,
): Promise<Category> {
  return request<Category>(`/categories/${id}/improvisation`, {
    method: 'PATCH',
    body: JSON.stringify({ isImprovisation }),
  });
}
```

  and in `Category`: `// Лише для стилю: виступ у ньому — імпровізація.\n  isImprovisation: boolean;`.

- [ ] **Step 2: Constants**

```ts
export const IMPROVISATION_TOGGLE_LABEL = 'Імпровізація';
export const IMPROVISATION_TOGGLE_ON_ICON = '♪̸';
export const IMPROVISATION_TOGGLE_OFF_ICON = '♪';
export const IMPROVISATION_TOGGLE_HINT =
  'Спільно для всіх конкурсів: виступ у цьому стилі — імпровізація, без треку, час з таймінгів.';
export const IMPROVISATION_TOGGLE_FAILED_MESSAGE =
  'Не вдалося змінити ознаку імпровізації.';
```

- [ ] **Step 3: Component** — a single button that flips the flag and reports the updated category (same `onSaved` contract as `CategoryDescriptionEditor`, so the builder reuses `applyDescription`, renamed to `applyCategoryUpdate` since it now serves both):

```tsx
import { useState } from 'react';
import { CategoryApiError, updateCategoryImprovisation } from '../../lib/categories';
import type { Category } from '../../lib/categories';
import {
  IMPROVISATION_TOGGLE_FAILED_MESSAGE,
  IMPROVISATION_TOGGLE_HINT,
  IMPROVISATION_TOGGLE_LABEL,
  IMPROVISATION_TOGGLE_OFF_ICON,
  IMPROVISATION_TOGGLE_ON_ICON,
} from './StyleImprovisationToggle.constants';

interface StyleImprovisationToggleProps {
  category: Category;
  onSaved: (updated: Category) => void;
  onError: (message: string) => void;
}

export default function StyleImprovisationToggle({
  category,
  onSaved,
  onError,
}: StyleImprovisationToggleProps) {
  const [saving, setSaving] = useState(false);

  const toggle = async () => {
    setSaving(true);
    try {
      onSaved(await updateCategoryImprovisation(category.id, !category.isImprovisation));
    } catch (err) {
      onError(err instanceof CategoryApiError ? err.message : IMPROVISATION_TOGGLE_FAILED_MESSAGE);
    } finally {
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      aria-pressed={category.isImprovisation}
      aria-label={`${IMPROVISATION_TOGGLE_LABEL}: ${category.name}`}
      title={IMPROVISATION_TOGGLE_HINT}
      disabled={saving}
      onClick={() => void toggle()}
    >
      {category.isImprovisation ? IMPROVISATION_TOGGLE_ON_ICON : IMPROVISATION_TOGGLE_OFF_ICON}
    </button>
  );
}
```

  Errors go to the builder's existing `setError` (the channel `saveRange` uses at ~line 311), passed as `onError`. Callback props follow the existing `CategoryDescriptionEditor` (`onSaved`/`onCancel`).

- [ ] **Step 4: Builder** — next to the description button (inside `canDescribe`), for saved styles only:

```tsx
                      {canDescribe &&
                        type === STYLE_CATEGORY_TYPE &&
                        !isDraftCategory(category.id) && (
                          <StyleImprovisationToggle
                            category={category}
                            onSaved={applyCategoryUpdate}
                            onError={setError}
                          />
                        )}
```

- [ ] **Step 5: Verify** — `cd frontend && npx tsc -b` → it will now fail in the files Task 7 fixes; that is expected. Proceed to Task 7 and verify there.

---

### Task 7: Frontend reads the derived flag everywhere

**Files:**
- Modify: `frontend/src/components/admin/NominationsPanel.tsx` (bulk mutation 137-146, handler 165-175, payload 214, badge 318, exits 331-344, duration input 373-389, bulk bar 526-543)
- Modify: `frontend/src/components/nominations/NominationSetBuilder.tsx` (checkbox ~751-762, `allowsImprovisation` at 425/467, `hideImprovisation` prop 95/108/699)
- Modify: `frontend/src/components/nominations/SpecialCategoryModal.tsx` (16, 27, 178, 213)
- Modify: `frontend/src/pages/NewCompetitionPage.tsx` (246, 550, 626, 1450-1462)
- Modify: `frontend/src/pages/CategoryTemplateFormPage.tsx` (106, 262, 383), `CategoryTemplateDetailPage.tsx:103`
- Modify: `frontend/src/lib/nominationSet.ts:31`, `templateNominations.ts:16`, `categoryTemplates.ts:30,41`
- Modify: `frontend/src/pages/ApplyPage.tsx` (79-90, 563-605, 815-842)
- Modify: `frontend/src/lib/nominationRowKey.ts`, delete `nominationRowKey.constants.ts`
- Modify: `frontend/src/components/admin/EntryEditModal.tsx` (54, 66, 163, 298-307), `frontend/src/lib/entryEdit.types.ts:25`
- Delete: `frontend/src/lib/improvisationProgram.ts`, `frontend/src/lib/improvisationProgram.constants.ts`
- Create: `frontend/src/lib/improvisationDuration.ts`

- [ ] **Step 1: Improvisation time for display** — `improvisationDuration.ts`:

```ts
import type { CompetitionRules } from './competitionRules';

// The timings screen writes one value into both improv fields.
export function improvisationSecondsOf(rules: CompetitionRules): number {
  return rules.improvGroupSeconds;
}
```

- [ ] **Step 2: NominationsPanel**
  - Remove `setImprovisationMutation`, `handleBulkImprovisation`, both bulk buttons and the `setImprovisationBulk`/`NominationBulkSelector` imports if unused; keep `NominationBulkBar` if it still has other children, otherwise leave it with the remaining actions as they are.
  - Drop `allowsImprovisation: d.allowsImprovisation,` from the special payload (214).
  - Badge: `{nomination.isImprovisation && (<span className={styles.badgeImprov}>імпровізація</span>)}`.
  - Add `const rulesQuery = useQuery({ queryKey: queryKeys.rules(competitionId), queryFn: () => getRules(competitionId) });` and `const improvSeconds = rulesQuery.data ? improvisationSecondsOf(rulesQuery.data) : null;`.
  - Exit list line: when `exit.isImprovisation`, render `імпровізація{improvSeconds !== null && ` · ${formatDuration(improvSeconds)}`}` in `styles.exitLimit`, otherwise the current `до …`.
  - Duration input: `disabled={nomination.exitMode === 'per_program' || nomination.isImprovisation}`; value for an improvisation nomination is `formatDuration(improvSeconds)` (read-only display), otherwise the current expression. Same for the read-only `rowMeta` branch (410-412).
- [ ] **Step 3: Builders/pages** — remove every `allowsImprovisation` field, the improvisation checkboxes in `NominationSetBuilder` and `NewCompetitionPage`, the `hideImprovisation` prop and its uses. `CategoryTemplateDetailPage:103`: templates have no derived flag in their DTO — remove the « · імпровізація» suffix (spec: a template nomination is an improvisation through its styles; no badge needed there).
- [ ] **Step 4: SpecialCategoryModal** — `timedPrograms = programs.filter((p) => !p.isImprovisation)`; remove the `isImprovisationProgram` import and `allowsImprovisation` from the draft type (27) and preview (213).
- [ ] **Step 5: ApplyPage** — one row per nomination:

```tsx
  const styleRows: NominationRow[] = useMemo(
    () =>
      entryNominations.map((n) => ({
        key: nominationRowKey(n.id),
        nominationId: n.id,
        takesNoTrack: n.exits.every((exit) => exit.isImprovisation),
        isSpecial: false,
        label: n.isImprovisation ? `${n.name} · Імпровізація` : n.name,
        price: n.price,
      })),
    [entryNominations],
  );
```

  `specialRows` the same without the label suffix; remove `improv` from `NominationRow` and from the create payload (822); `createdByRowKey` uses `nominationRowKey(entry.nominationId)`. `nominationRowKey(nominationId: string): string` returns the id; delete its constants file.
- [ ] **Step 6: EntryEditModal** — `improv` leaves the form state and the save payload; the checkbox becomes a read-only line shown when `entry.improv`: `<p className={styles.field}>Імпровізація (за стилем номінації)</p>`. Remove `improv` from `entryEdit.types.ts`.
- [ ] **Step 7:** delete `improvisationProgram.ts` and `.constants.ts`; `grep -rn "improvisationProgram\|allowsImprovisation\|setImprovisationBulk" frontend/src` → no output.
- [ ] **Step 8: Verify** — `cd frontend && npx tsc -b` → exit 0.

---

### Task 8: e2e client follows the API

**Files:**
- Modify: `e2e/tests/retest/admin-api.client.ts:16`
- Modify: `e2e/tests/retest/bugs-01-14.spec.ts:137-140, 353-376`

- [ ] **Step 1:** `admin-api.client.ts`: rename `allowsImprovisation` to `isImprovisation` in the nomination type.
- [ ] **Step 2:** `bugs-01-14.spec.ts`: delete the `bulk-improvisation` reset call in `afterAll` (137-140). The test «TASK-04 + fix #4 — bulk improvisation by filter» tests a removed feature: delete it and tell the Developer (replacing it is new test work, only on request).
- [ ] **Step 3: Verify** — `cd e2e && npx tsc --noEmit` (if the folder has a tsconfig) → exit 0. Do not run Playwright.

---

### Task 9 (release 2 — ship separately, after release 1 runs on production)

**Files:**
- Create: `backend/migrations/<date>-drop-allows-improvisation.ts`

- [ ] **Step 1:**

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Прапорець імпровізації живе на стилі (categories.isImprovisation) з
// попереднього релізу; ці колонки ніхто не читає.
const TABLES = ['nominations', 'template_nominations'];
const COLUMN = 'allowsImprovisation';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (columns[COLUMN]) await queryInterface.removeColumn(table, COLUMN);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const table of TABLES) {
      const columns = await queryInterface.describeTable(table);
      if (!columns[COLUMN]) {
        await queryInterface.addColumn(table, COLUMN, {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        });
      }
    }
  },
};
```

- [ ] **Step 2:** do not create this file in release 1's branch; the Developer decides when.

---

## After release 1 (tell the Developer)

- Run the migration, then «Перерахувати розклад» on competitions whose sections exist: frozen `section_items.durationSeconds` change only on recalculation.
- Check the style dictionary: a new improvisation style created by an organizer starts unflagged until an admin flips it.
