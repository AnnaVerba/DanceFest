# Special Nomination Single Payment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A dancer who is registered to several special nominations that share one name (e.g. «Корона» in different leagues/styles/ages) pays that name's price once; another dancer, even from the same trainer, still pays for themselves.

**Architecture:** Add a stored `nominations.specialName` (backfilled by a migration that also aligns prices inside a name-group), enforce «one price per special name per competition» on every write, and replace the scattered per-entry `price × dancers` formula with one `EntryChargeCalculator` that dedupes by `(dancer, competition + specialName)`. Amounts stay computed on the fly (nothing is snapshotted), so no entry data migration is needed. The apply form asks the server for a quote instead of mirroring the formula.

**Tech Stack:** NestJS 11 + Sequelize (sequelize-typescript) + Postgres, sequelize-cli migrations; React + Vite + TypeScript + TanStack Query.

**Spec:** Design approved in chat on 2026-09-21 (no separate spec file). Decisions: (1) the rule is per dancer, never per trainer/studio; (2) one price per special name inside a competition; (3) existing name-groups with different prices are aligned to the **maximum** price by the migration.

## Global Constraints

Taken from `CLAUDE.md` and the developer's saved preferences; every task inherits them.

- Address the user as **Developer** in every response.
- Classes, types, interfaces and constants live in **separate files**; no magic numbers or strings — create constants.
- Do **not pass functions as parameters**; use interfaces/classes for behavior.
- Follow SOLID/clean code; reuse existing code (`roundMoney`, `dancerCount`, `isCompetitionStaff`, `ownParticipantIds`, `resolvePage` etc.).
- **Do not write tests** and **do not commit** unless the Developer asks. This overrides the TDD/commit steps of the writing-plans template — the steps below end in a type-check instead.
- After edits run **only** `tsc` (backend: `cd backend && npx tsc --noEmit -p tsconfig.json`; frontend: `cd frontend && npx tsc -b`). No eslint, Playwright, screenshots or DB dry-runs — the Developer tests herself.
- No local machine paths (scratchpad, AppData, `C:/Users/...`) in any repo file.
- Admin CSS-module rule: don't add bare element selectors (`table`, `th`, `td`) to `*.module.css`. This plan adds no CSS.
- Comments: default none; one short line only for a non-obvious WHY. Migration comments in Ukrainian (repo convention).
- Money strings/labels in the UI are Ukrainian.

## The rule, precisely (read before any task)

For one competition and one **special group key** `G = competitionId + '|' + specialName` (only nominations with `isSpecial = true` and a non-null `specialName` have a key; every other nomination has no key):

1. For every dancer `D` (identified by `participantIds`), `D` pays `price(G)` **once** for all their entries whose nomination has key `G`.
2. The charge is attributed to `D`'s **first** such entry, ordered by `(createdAt ASC, id ASC)`; on later entries of the same group `D` contributes 0.
3. `entry.amount = price × (number of dancers paying on this entry) + extraFee`. Dancers without ids (hand-typed group headcount above `participantIds.length`) always pay.
4. Non-special entries keep today's formula: `price × dancerCount + extraFee`.
5. A dancer's per-entry share = `price` if they pay on this entry else `0`, plus `extraFee / dancerCount`.
6. Person totals do not depend on which entry is «first» — only the display row that carries the money does.

Example (same trainer): Марія → Корона Юніори + Корона Дорослі = 1 × price. Олег → Корона Юніори = 1 × price. Trainer's total = 2 × price.

## Open decision flagged for the Developer

**D1 — finance «Учасники» tab.** Today every dancer of a group number is charged the *full number cost* on that tab (`finance.service.ts:142`). To honour «pay once per person» the plan charges each dancer their own share (`EntryCharge.shareOf`) instead. For solos nothing changes; for group numbers each dancer now shows their share, which matches «Мої заявки». If the Developer wants the old «full number cost per dancer» view kept, only Task 5 step 6 changes.

## File Structure

**Backend — create**
- `backend/migrations/20260921090000-add-special-name-to-nominations.ts` — column, index, backfill, price alignment.
- `backend/src/nominations/special-name.ts` — `normalizeSpecialName`, `specialNameLookupKey`, `specialGroupKey`.
- `backend/src/nominations/nomination-pricing.interface.ts` — `NominationPricing`.
- `backend/src/nominations/special-nomination-groups.ts` — canonical spelling, group price read/align (injectable).
- `backend/src/entries/pricing/entry-charge.constants.ts` — `CHARGE_ENTRY_ATTRIBUTES`, `QUOTE_ROW_ID_PREFIX`.
- `backend/src/entries/pricing/chargeable-entry.interface.ts` — `ChargeableEntry`.
- `backend/src/entries/pricing/entry-charge.ts` — `EntryCharge` value class.
- `backend/src/entries/pricing/entry-charge-calculator.ts` — the single formula.
- `backend/src/entries/pricing/entry-charge.service.ts` — loads pricing + dancer history, quote.
- `backend/src/entries/dto/quote-entries.dto.ts`, `backend/src/entries/entries-quote.interface.ts`.

**Backend — modify**
- `nominations/nomination.model.ts`, `nominations.constants.ts`, `nominations.service.ts`, `nominations.module.ts`, `dto/create-nomination.dto.ts`.
- `entries/entry-amount.ts` (shrinks), `entries/entries.service.ts`, `entries/entries.module.ts`, `entries/entries.controller.ts`, `entries/entries.constants.ts`.
- `finance/finance.service.ts`, `finance/priced-entry.interface.ts`, `finance/finance.constants.ts`.

**Frontend — create**
- `frontend/src/lib/entriesQuote.types.ts`, `frontend/src/lib/entriesQuote.constants.ts`, `frontend/src/lib/useEntriesQuote.ts`.

**Frontend — modify**
- `lib/nominations.ts`, `lib/entries.ts`, `lib/entryAmount.ts`, `lib/entryAmount.constants.ts`, `pages/ApplyPage.tsx`, `pages/NewCompetitionPage.tsx`, `components/admin/NominationsPanel.tsx`, `components/admin/nominationSelection/nominationFilters.constants.ts`.

---

### Task 1: Database — `nominations.specialName`, backfill, price alignment

**Files:**
- Create: `backend/migrations/20260921090000-add-special-name-to-nominations.ts`
- Modify: `backend/src/nominations/nomination.model.ts` (after `templateId`, ~line 35)

**Interfaces:**
- Produces: DB column `nominations."specialName" VARCHAR NULL`; index `nominations_competition_special_name_idx (competitionId, specialName)`; model field `declare specialName: string | null`.
- Invariant produced for later tasks: after this migration, every special nomination has a non-null `specialName`, spelled identically within a competition for all case/space variants, and all members of one `(competitionId, specialName)` group share one price.

- [ ] **Step 1: Write the migration**

The migration is self-contained on purpose (it must not import app code that can change later). Name resolution order: template (`templateId` + sorted `categoryIds` → `template_nominations.specialName`) → first segment of the label before ` · ` → the whole label.

```ts
import type { QueryInterface } from 'sequelize';
import { DataTypes, QueryTypes } from 'sequelize';

// Спецномінації одного змагання з однаковою назвою («Корона») платяться
// один раз, тому назва мусить зберігатись окремо від повної мітки
// «Корона · Юніори 1 · Дебют». Ціна одна на назву — розбіжності вирівнюються
// до найбільшої, а що саме змінилось, виводиться в лог міграції.
const SPECIAL_LABEL_SEPARATOR = ' · ';
const WHITESPACE_PATTERN = /\s+/g;
const KEY_SEPARATOR = '|';
const CATEGORY_IDS_SEPARATOR = ',';
const INDEX_NAME = 'nominations_competition_special_name_idx';
const LOG_PREFIX = '[special-name]';

interface SpecialNominationRow {
  id: string;
  competitionId: string;
  templateId: string | null;
  name: string;
  price: string | null;
  specialName: string | null;
  categoryIds: string[];
}

interface TemplateSpecialRow {
  templateId: string;
  categoryIds: string[];
  specialName: string;
}

const normalize = (raw: string): string =>
  raw.trim().replace(WHITESPACE_PATTERN, ' ');

const lookupKey = (raw: string): string => normalize(raw).toLocaleLowerCase();

const templateKey = (templateId: string, categoryIds: string[]): string =>
  `${templateId}${KEY_SEPARATOR}${[...categoryIds].sort().join(CATEGORY_IDS_SEPARATOR)}`;

const groupKey = (competitionId: string, name: string): string =>
  `${competitionId}${KEY_SEPARATOR}${name}`;

async function loadSpecialNominations(
  queryInterface: QueryInterface,
): Promise<SpecialNominationRow[]> {
  return queryInterface.sequelize.query<SpecialNominationRow>(
    `SELECT id, "competitionId", "templateId", name, price, "specialName",
            "categoryIds"::text[] AS "categoryIds"
       FROM nominations
      WHERE "isSpecial" = true
      ORDER BY "createdAt" ASC, id ASC`,
    { type: QueryTypes.SELECT },
  );
}

async function loadTemplateSpecialNames(
  queryInterface: QueryInterface,
): Promise<Map<string, string>> {
  const rows = await queryInterface.sequelize.query<TemplateSpecialRow>(
    `SELECT "templateId", "categoryIds"::text[] AS "categoryIds", "specialName"
       FROM template_nominations
      WHERE "isSpecial" = true
        AND "specialName" IS NOT NULL
        AND btrim("specialName") <> ''`,
    { type: QueryTypes.SELECT },
  );
  return new Map(
    rows.map((r) => [templateKey(r.templateId, r.categoryIds), r.specialName]),
  );
}

async function backfillSpecialNames(
  queryInterface: QueryInterface,
): Promise<void> {
  const rows = await loadSpecialNominations(queryInterface);
  const templateNames = await loadTemplateSpecialNames(queryInterface);

  // First spelling met in a competition wins for every case/space variant.
  const spelling = new Map<string, string>();
  for (const row of rows) {
    if (!row.specialName) continue;
    const key = groupKey(row.competitionId, lookupKey(row.specialName));
    if (!spelling.has(key)) spelling.set(key, row.specialName);
  }

  const idsByName = new Map<string, string[]>();
  const fallbackLog: string[] = [];
  for (const row of rows.filter((r) => !r.specialName)) {
    const fromTemplate = row.templateId
      ? templateNames.get(templateKey(row.templateId, row.categoryIds))
      : undefined;
    const bare =
      normalize(fromTemplate ?? row.name.split(SPECIAL_LABEL_SEPARATOR)[0]) ||
      normalize(row.name);
    if (!fromTemplate) fallbackLog.push(`${row.id} «${row.name}» -> «${bare}»`);

    const key = groupKey(row.competitionId, lookupKey(bare));
    if (!spelling.has(key)) spelling.set(key, bare);
    const name = spelling.get(key) as string;
    idsByName.set(name, [...(idsByName.get(name) ?? []), row.id]);
  }

  for (const [name, ids] of idsByName) {
    await queryInterface.sequelize.query(
      `UPDATE nominations SET "specialName" = :name WHERE id IN (:ids)`,
      { replacements: { name, ids } },
    );
  }
  if (fallbackLog.length > 0) {
    console.log(
      `${LOG_PREFIX} назву взято з мітки (шаблону немає), перевірте:\n${fallbackLog.join('\n')}`,
    );
  }
}

async function alignGroupPrices(queryInterface: QueryInterface): Promise<void> {
  const rows = (await loadSpecialNominations(queryInterface)).filter(
    (r) => r.specialName,
  );
  const groups = new Map<string, SpecialNominationRow[]>();
  for (const row of rows) {
    const key = groupKey(row.competitionId, row.specialName as string);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  for (const [key, members] of groups) {
    const prices = members
      .filter((m) => m.price !== null)
      .map((m) => Number(m.price));
    if (prices.length === 0) continue;
    const highest = Math.max(...prices);
    const stale = members.filter(
      (m) => m.price === null || Number(m.price) !== highest,
    );
    if (stale.length === 0) continue;

    await queryInterface.sequelize.query(
      `UPDATE nominations SET price = :price WHERE id IN (:ids)`,
      { replacements: { price: highest, ids: stale.map((m) => m.id) } },
    );
    console.log(
      `${LOG_PREFIX} ціну групи ${key} вирівняно до ${highest}: ${stale
        .map((m) => `${m.id} (${m.price ?? 'без ціни'})`)
        .join(', ')}`,
    );
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const columns = await queryInterface.describeTable('nominations');
    if (!('specialName' in columns)) {
      await queryInterface.addColumn('nominations', 'specialName', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    const indexes = (await queryInterface.showIndex('nominations')) as {
      name: string;
    }[];
    if (!indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.addIndex('nominations', {
        fields: ['competitionId', 'specialName'],
        name: INDEX_NAME,
      });
    }

    await backfillSpecialNames(queryInterface);
    await alignGroupPrices(queryInterface);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('nominations', INDEX_NAME);
    await queryInterface.removeColumn('nominations', 'specialName');
  },
};
```

- [ ] **Step 2: Add the model column**

In `backend/src/nominations/nomination.model.ts`, after the `templateId` column block:

```ts
  // Голе ім'я спецномінації без ліги, віку й програми — за ним усі «корони»
  // змагання мають одну ціну й оплачуються один раз.
  @Column({ type: DataType.STRING, allowNull: true })
  declare specialName: string | null;
```

- [ ] **Step 3: Type-check**

Run: `cd backend && npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (The Developer runs `npm run migrate` herself; the migration also runs on deploy.)

---

### Task 2: Special-name helpers and pricing lookup

**Files:**
- Create: `backend/src/nominations/special-name.ts`, `backend/src/nominations/nomination-pricing.interface.ts`
- Modify: `backend/src/nominations/nominations.constants.ts` (append), `backend/src/nominations/nominations.service.ts` (`findPricesByIds` ~524-533 → `findPricingByIds`; `toDto` ~783-809)

**Interfaces:**
- Produces:
  - `normalizeSpecialName(raw: string): string` — trim + collapse whitespace.
  - `specialNameLookupKey(raw: string): string` — normalized + lower-cased, for case-insensitive comparison in JS only (never in SQL).
  - `specialGroupKey(competitionId: string, specialName: string): string`.
  - `interface NominationPricing { competitionId: string; price: number | null; specialGroupKey: string | null }`.
  - `NominationsService.findPricingByIds(ids: string[]): Promise<Map<string, NominationPricing>>` (replaces `findPricesByIds`, which has exactly one caller, changed in Task 5).
  - Nomination DTO gains `specialName: string | null`.

- [ ] **Step 1: Constants** — append to `nominations.constants.ts`:

```ts
export const SPECIAL_NAME_WHITESPACE_PATTERN = /\s+/g;
export const SPECIAL_GROUP_KEY_SEPARATOR = '|';
export const SPECIAL_NAME_REQUIRED_MESSAGE =
  'Вкажіть назву спеціальної номінації';
export const SPECIAL_NAME_PRICE_CONFLICT_MESSAGE =
  'Для спеціальної номінації вказано різні ціни';
```

- [ ] **Step 2: `special-name.ts`**

```ts
import {
  SPECIAL_GROUP_KEY_SEPARATOR,
  SPECIAL_NAME_WHITESPACE_PATTERN,
} from './nominations.constants';

export function normalizeSpecialName(raw: string): string {
  return raw.trim().replace(SPECIAL_NAME_WHITESPACE_PATTERN, ' ');
}

// Case-insensitive on purpose, and done here rather than with SQL lower():
// its result depends on the database's locale.
export function specialNameLookupKey(raw: string): string {
  return normalizeSpecialName(raw).toLocaleLowerCase();
}

export function specialGroupKey(
  competitionId: string,
  specialName: string,
): string {
  return `${competitionId}${SPECIAL_GROUP_KEY_SEPARATOR}${specialName}`;
}
```

- [ ] **Step 3: `nomination-pricing.interface.ts`**

```ts
// What an entry needs to know about its nomination to be priced.
// `specialGroupKey` is null for a nomination that is not a named special one:
// it is then charged on its own, without the pay-once rule.
export interface NominationPricing {
  competitionId: string;
  price: number | null;
  specialGroupKey: string | null;
}
```

- [ ] **Step 4: Replace `findPricesByIds`** in `nominations.service.ts` (add imports for `specialGroupKey` and `NominationPricing`):

```ts
  // Price and pay-once group of each nomination — what an entry against it
  // costs (see EntryChargeCalculator).
  async findPricingByIds(
    ids: string[],
  ): Promise<Map<string, NominationPricing>> {
    if (ids.length === 0) return new Map();
    const nominations = await this.nominationModel.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'competitionId', 'price', 'isSpecial', 'specialName'],
    });
    return new Map(
      nominations.map((n) => [
        n.id,
        {
          competitionId: n.competitionId,
          price: n.price === null ? null : Number(n.price),
          specialGroupKey:
            n.isSpecial && n.specialName
              ? specialGroupKey(n.competitionId, n.specialName)
              : null,
        },
      ]),
    );
  }
```

- [ ] **Step 5: Expose `specialName`** — in `toDto`, after `isSpecial: nomination.isSpecial,` add `specialName: nomination.specialName,`.

- [ ] **Step 6: Type-check** — `cd backend && npx tsc --noEmit -p tsconfig.json`. It will report the one remaining `findPricesByIds` caller in `entries.service.ts`; that is fixed in Task 5 (leave it failing until then, or do Tasks 2-5 before checking).

---

### Task 3: Write path — one price per special name

**Files:**
- Create: `backend/src/nominations/special-nomination-groups.ts`
- Modify: `nominations/dto/create-nomination.dto.ts`, `nominations/nominations.service.ts` (`create` 104-124, `bulkCreate` 126-155, `update` 157-230, `toAttributes` 535-551, constructor), `nominations/nominations.module.ts`

**Interfaces:**
- Consumes: Task 2 helpers/constants.
- Produces `SpecialNominationGroups` (injectable):
  - `canonicalNames(competitionId: string, rawNames: string[], transaction?: Transaction): Promise<Map<string, string>>` — raw → canonical spelling (existing spelling in the competition wins, then first spelling in this batch).
  - `findGroupPrice(competitionId, specialName, transaction?): Promise<number | null>`
  - `alignPrice(competitionId, specialName, price: number | null, transaction: Transaction): Promise<void>` — sets `price` on **every** member of the group.
  - `assign(competitionId, attributesList: CreationAttributes<Nomination>[], transaction: Transaction): Promise<Map<string, number>>` — canonicalizes `specialName` and settles `price` for the new specials; returns the groups whose price the batch set explicitly (`specialName → price`), so the caller aligns existing members after the insert. Throws 400 `SPECIAL_NAME_PRICE_CONFLICT_MESSAGE` when one batch gives one name two prices.
  - `alignExplicit(competitionId, explicit: Map<string, number>, transaction): Promise<void>`.

- [ ] **Step 1: `special-nomination-groups.ts`**

```ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import type { CreationAttributes, Transaction } from 'sequelize';
import { Nomination } from './nomination.model';
import { SPECIAL_NAME_PRICE_CONFLICT_MESSAGE } from './nominations.constants';
import {
  normalizeSpecialName,
  specialNameLookupKey,
} from './special-name';

@Injectable()
export class SpecialNominationGroups {
  constructor(
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
  ) {}

  async canonicalNames(
    competitionId: string,
    rawNames: string[],
    transaction?: Transaction,
  ): Promise<Map<string, string>> {
    const existing = await this.nominationModel.findAll({
      where: { competitionId, isSpecial: true, specialName: { [Op.ne]: null } },
      attributes: ['specialName'],
      order: [['createdAt', 'ASC']],
      transaction,
    });
    const spelling = new Map<string, string>();
    for (const { specialName } of existing) {
      const key = specialNameLookupKey(specialName as string);
      if (!spelling.has(key)) spelling.set(key, specialName as string);
    }

    const canonical = new Map<string, string>();
    for (const raw of rawNames) {
      const normalized = normalizeSpecialName(raw);
      const key = specialNameLookupKey(normalized);
      if (!spelling.has(key)) spelling.set(key, normalized);
      canonical.set(raw, spelling.get(key) as string);
    }
    return canonical;
  }

  async findGroupPrice(
    competitionId: string,
    specialName: string,
    transaction?: Transaction,
  ): Promise<number | null> {
    const member = await this.nominationModel.findOne({
      where: {
        competitionId,
        isSpecial: true,
        specialName,
        price: { [Op.ne]: null },
      },
      attributes: ['price'],
      transaction,
    });
    return member === null ? null : Number(member.price);
  }

  async alignPrice(
    competitionId: string,
    specialName: string,
    price: number | null,
    transaction: Transaction,
  ): Promise<void> {
    await this.nominationModel.update(
      { price },
      { where: { competitionId, isSpecial: true, specialName }, transaction },
    );
  }

  async assign(
    competitionId: string,
    attributesList: CreationAttributes<Nomination>[],
    transaction: Transaction,
  ): Promise<Map<string, number>> {
    const specials = attributesList.filter((a) => a.isSpecial);
    if (specials.length === 0) return new Map();

    const canonical = await this.canonicalNames(
      competitionId,
      specials.map((a) => a.specialName as string),
      transaction,
    );
    const explicit = new Map<string, number>();
    for (const attributes of specials) {
      const name = canonical.get(attributes.specialName as string) as string;
      attributes.specialName = name;
      if (attributes.price === null || attributes.price === undefined) continue;
      const price = Number(attributes.price);
      const known = explicit.get(name);
      if (known !== undefined && known !== price) {
        throw new BadRequestException(
          `${SPECIAL_NAME_PRICE_CONFLICT_MESSAGE} «${name}»`,
        );
      }
      explicit.set(name, price);
    }

    for (const attributes of specials) {
      const name = attributes.specialName as string;
      const price =
        explicit.get(name) ??
        (await this.findGroupPrice(competitionId, name, transaction));
      if (price !== null) attributes.price = price;
    }
    return explicit;
  }

  async alignExplicit(
    competitionId: string,
    explicit: Map<string, number>,
    transaction: Transaction,
  ): Promise<void> {
    for (const [name, price] of explicit) {
      await this.alignPrice(competitionId, name, price, transaction);
    }
  }
}
```

- [ ] **Step 3: DTO** — in `create-nomination.dto.ts` add `ValidateIf` to the `class-validator` import, and after `isSpecial`:

```ts
  @ApiPropertyOptional({
    example: 'Корона',
    description:
      'The bare name of a special category, without league/age/program. Required when isSpecial. ' +
      'Special nominations sharing a name share one price and are paid once per dancer.',
  })
  @ValidateIf((o: CreateNominationDto) => o.isSpecial === true)
  @IsString()
  @IsNotEmpty()
  specialName?: string;
```

(`UpdateNominationDto` is a `PartialType`, so it inherits this; `ValidateIf` is skipped when `isSpecial` is not sent, and the service enforces the rule below.)

- [ ] **Step 4: `toAttributes`** — add to the returned object, after `isSpecial`:

```ts
      specialName: dto.isSpecial ? (dto.specialName ?? null) : null,
```

- [ ] **Step 5: Inject the groups service** — add `private readonly specialGroups: SpecialNominationGroups,` to the `NominationsService` constructor (import it); in `nominations.module.ts` add `SpecialNominationGroups` to `providers`.

- [ ] **Step 6: `create`** — replace the last two statements (`const nomination = await this.nominationModel.create(attributes);` …) with:

```ts
    const nomination = await this.nominationModel.sequelize!.transaction(
      async (transaction) => {
        const explicit = await this.specialGroups.assign(
          competitionId,
          [attributes],
          transaction,
        );
        const created = await this.nominationModel.create(attributes, {
          transaction,
        });
        await this.specialGroups.alignExplicit(
          competitionId,
          explicit,
          transaction,
        );
        return created;
      },
    );
```

- [ ] **Step 7: `bulkCreate`** — replace the transaction block with:

```ts
    const created = await this.nominationModel.sequelize!.transaction(
      async (transaction) => {
        const explicit = await this.specialGroups.assign(
          competitionId,
          attributesList,
          transaction,
        );
        const rows = await bulkCreateChunked(
          this.nominationModel,
          attributesList,
          transaction,
        );
        await this.specialGroups.alignExplicit(
          competitionId,
          explicit,
          transaction,
        );
        return rows;
      },
    );
```

(`assign` mutates `attributesList` in place, so `bulkCreateChunked` inserts the canonical names/prices.)

- [ ] **Step 8: `update`** — after the line `if (dto.isSpecial !== undefined) nomination.isSpecial = dto.isSpecial;` add:

```ts
    let specialNameChanged = false;
    if (dto.specialName !== undefined) {
      nomination.specialName = normalizeSpecialName(dto.specialName);
      specialNameChanged = true;
    }
    if (!nomination.isSpecial) {
      nomination.specialName = null;
    } else if (!nomination.specialName) {
      throw new BadRequestException(SPECIAL_NAME_REQUIRED_MESSAGE);
    }
```

  and replace `await nomination.save();` with:

```ts
    await nomination.sequelize!.transaction(async (transaction) => {
      if (nomination.isSpecial && specialNameChanged) {
        const canonical = await this.specialGroups.canonicalNames(
          competitionId,
          [nomination.specialName as string],
          transaction,
        );
        nomination.specialName = canonical.get(
          nomination.specialName as string,
        ) as string;
        const groupPrice =
          dto.price === undefined
            ? await this.specialGroups.findGroupPrice(
                competitionId,
                nomination.specialName,
                transaction,
              )
            : null;
        if (groupPrice !== null) nomination.price = groupPrice;
      }
      await nomination.save({ transaction });
      if (nomination.isSpecial && dto.price !== undefined) {
        await this.specialGroups.alignPrice(
          competitionId,
          nomination.specialName as string,
          nomination.price,
          transaction,
        );
      }
    });
```

  Add imports: `normalizeSpecialName` from `./special-name`, `SPECIAL_NAME_REQUIRED_MESSAGE` and `SpecialNominationGroups`.

- [ ] **Step 9: Type-check** (see Task 2 step 6 note).

---

### Task 4: The single charge formula

**Files:**
- Create: `backend/src/entries/pricing/chargeable-entry.interface.ts`, `entry-charge.ts`, `entry-charge-calculator.ts`
- Modify: `backend/src/entries/entry-amount.ts`

**Interfaces:**
- Consumes: `NominationPricing` (Task 2).
- Produces:
  - `ChargeableEntry` (structurally satisfied by the `Entry` model).
  - `class EntryCharge { get amount(): number; shareOf(participantId: string): number }`.
  - `@Injectable() class EntryChargeCalculator { calculate(entries: ChargeableEntry[], pricing: ReadonlyMap<string, NominationPricing>): Map<string, EntryCharge> }` keyed by entry id. **The caller must pass the complete scope** — every entry the pay-once rule can compare.
  - `entry-amount.ts` keeps `roundMoney` and exports `dancerCount(entry)`; `calculateEntryAmount`, `calculateParticipantShare`, `priceOf` are deleted (their callers move in Task 5).

- [ ] **Step 1: `chargeable-entry.interface.ts`**

```ts
// The slice of an entry the charge formula reads.
export interface ChargeableEntry {
  id: string;
  createdAt: Date;
  nominationId: string | null;
  participantIds: string[] | null;
  participantsCount: number | null;
  extraFee: number | string;
}
```

- [ ] **Step 2: shrink `entry-amount.ts`** to:

```ts
import type { ChargeableEntry } from './pricing/chargeable-entry.interface';
import {
  MIN_PARTICIPANTS_PER_ENTRY,
  MONEY_ROUNDING_FACTOR,
} from './entries.constants';

export function roundMoney(amount: number): number {
  return (
    Math.round((amount + Number.EPSILON) * MONEY_ROUNDING_FACTOR) /
    MONEY_ROUNDING_FACTOR
  );
}

// How many people an entry puts on stage — at least one, even for an entry
// typed in by hand without dancers.
export function dancerCount(
  entry: Pick<ChargeableEntry, 'participantsCount' | 'participantIds'>,
): number {
  return Math.max(
    entry.participantsCount ?? entry.participantIds?.length ?? 0,
    MIN_PARTICIPANTS_PER_ENTRY,
  );
}
```

- [ ] **Step 3: `entry-charge.ts`**

```ts
import { roundMoney } from '../entry-amount';

interface EntryChargeParts {
  price: number;
  dancerCount: number;
  extraFee: number;
  // Everyone named on the entry, and the part of them who pay the price here
  // (someone who already paid for the same special name elsewhere does not).
  participantIds: ReadonlySet<string>;
  payingParticipantIds: ReadonlySet<string>;
  // Headcount typed in by hand beyond the named dancers; they always pay.
  unidentifiedPayers: number;
}

export class EntryCharge {
  constructor(private readonly parts: EntryChargeParts) {}

  get amount(): number {
    const { price, dancerCount, extraFee } = this.parts;
    const payers = Math.min(
      this.parts.payingParticipantIds.size + this.parts.unidentifiedPayers,
      dancerCount,
    );
    return roundMoney(price * payers + extraFee);
  }

  // One dancer's part: the price if they pay it on this entry, plus an equal
  // share of the extra-time fee. A user not named on the entry is priced as a
  // payer — only a dancer who already paid elsewhere gets the price waived.
  shareOf(participantId: string): number {
    const { price, dancerCount, extraFee } = this.parts;
    const waived =
      this.parts.participantIds.has(participantId) &&
      !this.parts.payingParticipantIds.has(participantId);
    return roundMoney((waived ? 0 : price) + extraFee / dancerCount);
  }
}
```

- [ ] **Step 4: `entry-charge-calculator.ts`**

```ts
import { Injectable } from '@nestjs/common';
import type { NominationPricing } from '../../nominations/nomination-pricing.interface';
import { dancerCount } from '../entry-amount';
import type { ChargeableEntry } from './chargeable-entry.interface';
import { EntryCharge } from './entry-charge';

@Injectable()
export class EntryChargeCalculator {
  calculate(
    entries: ChargeableEntry[],
    pricing: ReadonlyMap<string, NominationPricing>,
  ): Map<string, EntryCharge> {
    const paidByGroup = new Map<string, Set<string>>();
    const charges = new Map<string, EntryCharge>();

    for (const entry of [...entries].sort(byCreationOrder)) {
      const nominationPricing = entry.nominationId
        ? pricing.get(entry.nominationId)
        : undefined;
      const participantIds = entry.participantIds ?? [];
      const dancers = dancerCount(entry);
      const paying = new Set<string>();

      const groupKey = nominationPricing?.specialGroupKey ?? null;
      if (groupKey === null) {
        participantIds.forEach((id) => paying.add(id));
      } else {
        const paid = paidByGroup.get(groupKey) ?? new Set<string>();
        for (const id of participantIds) {
          if (paid.has(id)) continue;
          paid.add(id);
          paying.add(id);
        }
        paidByGroup.set(groupKey, paid);
      }

      charges.set(
        entry.id,
        new EntryCharge({
          price: nominationPricing?.price ?? 0,
          dancerCount: dancers,
          extraFee: Number(entry.extraFee),
          participantIds: new Set(participantIds),
          payingParticipantIds: paying,
          unidentifiedPayers: Math.max(dancers - participantIds.length, 0),
        }),
      );
    }
    return charges;
  }
}

// `id` only breaks ties between entries saved in the same millisecond (bulk
// apply), so «the first entry» is stable.
function byCreationOrder(a: ChargeableEntry, b: ChargeableEntry): number {
  return (
    a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id)
  );
}
```

- [ ] **Step 5: Type-check** (callers of the deleted functions are fixed in Task 5).

---

### Task 5: Load the right scope; switch every caller to the calculator

**Files:**
- Create: `backend/src/entries/pricing/entry-charge.constants.ts`, `backend/src/entries/pricing/entry-charge.service.ts`
- Modify: `backend/src/entries/entries.module.ts`, `backend/src/entries/entries.service.ts` (`list` 112-163, `listForUser` 660-717, `toStaffDetailsDto` ~895-916, delete `loadPrices` 918-929, imports 28-29, constructor), `backend/src/finance/finance.service.ts`, `backend/src/finance/priced-entry.interface.ts`, `backend/src/finance/finance.constants.ts`

**Interfaces:**
- Consumes: `EntryChargeCalculator`, `EntryCharge`, `NominationsService.findPricingByIds`.
- Produces `EntryChargeService` (injectable, exported from `EntriesModule`):
  - `forCompleteScope(entries: ChargeableEntry[]): Promise<Map<string, EntryCharge>>` — caller already holds every entry the rule can compare (finance: the whole competition).
  - `withDancerHistory(entries: Entry[]): Promise<Map<string, EntryCharge>>` — for a page / one entry / a user's list: also pulls in the other entries of the same dancers (any competition; the group key contains the competition id, so mixing is harmless).
  - `quote(...)` is added in Task 6.

- [ ] **Step 1: `entry-charge.constants.ts`**

```ts
// Everything the charge formula reads from an entry.
export const CHARGE_ENTRY_ATTRIBUTES: string[] = [
  'id',
  'createdAt',
  'nominationId',
  'participantIds',
  'participantsCount',
  'extraFee',
];

// Id prefix of entries that do not exist yet — a quote prices them as if the
// dancers had just submitted them.
export const QUOTE_ROW_ID_PREFIX = 'quote:';
```

- [ ] **Step 2: `entry-charge.service.ts`** (the `quote` method is written in Task 6)

```ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { NominationsService } from '../../nominations/nominations.service';
import type { NominationPricing } from '../../nominations/nomination-pricing.interface';
import { Entry } from '../entry.model';
import type { ChargeableEntry } from './chargeable-entry.interface';
import { CHARGE_ENTRY_ATTRIBUTES } from './entry-charge.constants';
import { EntryCharge } from './entry-charge';
import { EntryChargeCalculator } from './entry-charge-calculator';

@Injectable()
export class EntryChargeService {
  constructor(
    @InjectModel(Entry) private readonly entryModel: typeof Entry,
    private readonly nominationsService: NominationsService,
    private readonly calculator: EntryChargeCalculator,
  ) {}

  async forCompleteScope(
    entries: ChargeableEntry[],
  ): Promise<Map<string, EntryCharge>> {
    const pricing = await this.loadPricing(entries);
    return this.calculator.calculate(entries, pricing);
  }

  // A page of a list shows only some of a dancer's entries, but «the first
  // entry of the group» may sit on another page or in another list — so the
  // dancers' other entries are loaded as history.
  async withDancerHistory(entries: Entry[]): Promise<Map<string, EntryCharge>> {
    const participantIds = [
      ...new Set(entries.flatMap((e) => e.participantIds ?? [])),
    ];
    const history =
      participantIds.length === 0
        ? []
        : await this.entryModel.findAll({
            where: {
              participantIds: { [Op.overlap]: participantIds },
              id: { [Op.notIn]: entries.map((e) => e.id) },
            },
            attributes: CHARGE_ENTRY_ATTRIBUTES,
          });
    return this.forCompleteScope([...entries, ...history]);
  }

  private async loadPricing(
    entries: ChargeableEntry[],
  ): Promise<Map<string, NominationPricing>> {
    const nominationIds = [
      ...new Set(
        entries
          .map((e) => e.nominationId)
          .filter((id): id is string => id !== null),
      ),
    ];
    return this.nominationsService.findPricingByIds(nominationIds);
  }
}
```

- [ ] **Step 3: Module** — in `entries.module.ts` add `EntryChargeCalculator` and `EntryChargeService` to `providers`, and `EntryChargeService` to `exports` (imports for both).

- [ ] **Step 4: `EntriesService`** — remove the `calculateEntryAmount, calculateParticipantShare` import (keep `roundMoney` only if Task 6 uses it there); inject `private readonly entryChargeService: EntryChargeService`; delete `loadPrices`; then:

  `list` (replace `const prices = await this.loadPrices(rows);` and the row mapping):
```ts
    const charges = await this.entryChargeService.withDancerHistory(rows);
    return {
      rows: rows.map((e) => ({
        ...this.toDto(e, numbers),
        amount: (charges.get(e.id) as EntryCharge).amount,
      })),
      total: count,
      page,
      pageSize,
    };
```
  `listForUser` (replace `const prices = await this.loadPrices(entries);` and the `amount:` expression):
```ts
    const charges = await this.entryChargeService.withDancerHistory(entries);
    ...
        // A coach pays for the whole number; a dancer sees only their part.
        amount: seesFullCost
          ? (charges.get(entry.id) as EntryCharge).amount
          : (charges.get(entry.id) as EntryCharge).shareOf(user.id),
```
  `toStaffDetailsDto`:
```ts
    const charges = await this.entryChargeService.withDancerHistory([entry]);
    return {
      ...this.toDto(entry, numbers),
      amount: (charges.get(entry.id) as EntryCharge).amount,
      participants,
    };
```
  (import `EntryCharge` from `./pricing/entry-charge`.)

- [ ] **Step 5: Finance constants/interface** —
  `finance.constants.ts`: add `'createdAt',` to `FINANCE_ENTRY_ATTRIBUTES` and update its comment to «Only what EntryChargeCalculator and the group keys read.»
  `priced-entry.interface.ts`:
```ts
import type { Entry } from '../entries/entry.model';
import type { EntryCharge } from '../entries/pricing/entry-charge';

// An entry together with what it costs (see EntryChargeCalculator).
export interface PricedEntry {
  entry: Entry;
  amount: number;
  charge: EntryCharge;
}
```

- [ ] **Step 6: `FinanceService`** — swap `EntriesService` for `EntryChargeService` in the constructor and imports (remove the `calculateEntryAmount` import; keep `roundMoney`); in `loadPricedEntries` replace the last statements with:

```ts
    const charges = await this.entryChargeService.forCompleteScope(entries);
    return entries.map((entry) => {
      const charge = charges.get(entry.id) as EntryCharge;
      return { entry, amount: charge.amount, charge };
    });
```
  and in `addParticipants` (decision **D1**) change the loop and its comment:

```ts
  // Every dancer is charged their own share of the number (see EntryCharge).
  ...
    for (const { entry, amount, charge } of priced) {
      const participantIds = entry.participantIds ?? [];
      if (participantIds.length === 0) {
        groups.add(entry.routineName, entry.routineName, amount);
      }
      for (const id of participantIds) {
        const name = nameById.get(id);
        if (name !== undefined) groups.add(id, name, charge.shareOf(id));
      }
    }
```
  `FinanceModule` already imports `EntriesModule`, which now exports `EntryChargeService`.

- [ ] **Step 7: Type-check** — `cd backend && npx tsc --noEmit -p tsconfig.json`. Expected: no errors; `grep -rn "findPricesByIds\|calculateEntryAmount\|calculateParticipantShare\|loadPrices" backend/src` returns nothing.

---

### Task 6: Quote endpoint (server-side preview for the apply form)

**Files:**
- Create: `backend/src/entries/dto/quote-entries.dto.ts`, `backend/src/entries/entries-quote.interface.ts`
- Modify: `backend/src/entries/pricing/entry-charge.service.ts`, `backend/src/entries/entries.service.ts`, `backend/src/entries/entries.controller.ts`, `backend/src/entries/entries.constants.ts`

**Interfaces:**
- Consumes: Tasks 4–5.
- Produces `POST /competitions/:competitionId/entries/quote` body `{ participantIds: string[]; nominationIds: string[] }` → `{ amounts: number[]; total: number }`; `amounts[i]` is the price of `nominationIds[i]` **as if all rows are submitted now, after the dancers' existing entries**; repeated nomination ids (improvisation rows) are allowed.

- [ ] **Step 1: constants** — append to `entries.constants.ts`:

```ts
// A group number's dancers in one quote request.
export const MAX_QUOTE_PARTICIPANTS = 200;
```

- [ ] **Step 2: `entries-quote.interface.ts`**

```ts
export interface EntriesQuote {
  // Per requested nomination, in request order.
  amounts: number[];
  total: number;
}
```

- [ ] **Step 3: DTO** `quote-entries.dto.ts`

```ts
import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator';
import { MAX_QUOTE_PARTICIPANTS } from '../entries.constants';
import { MAX_ENTRIES_PER_SUBMISSION } from './bulk-create-entries.dto';

export class QuoteEntriesDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_QUOTE_PARTICIPANTS)
  @IsUUID(undefined, { each: true })
  participantIds: string[];

  @ApiProperty({
    type: [String],
    description: 'One id per selected row; an improvisation row repeats its id.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(MAX_ENTRIES_PER_SUBMISSION)
  @IsUUID(undefined, { each: true })
  nominationIds: string[];
}
```

- [ ] **Step 4: `EntryChargeService.quote`** — add (imports: `BadRequestException`, `NOMINATION_NOT_IN_COMPETITION_MESSAGE` from `../../nominations/nominations.constants`, `QUOTE_ROW_ID_PREFIX`):

```ts
  // Prices entries that do not exist yet: the dancers' saved entries in this
  // competition come first, then the proposed rows, oldest to newest.
  async quote(
    competitionId: string,
    participantIds: string[],
    nominationIds: string[],
  ): Promise<number[]> {
    const history = await this.entryModel.findAll({
      where: {
        competitionId,
        participantIds: { [Op.overlap]: participantIds },
      },
      attributes: CHARGE_ENTRY_ATTRIBUTES,
    });
    const submittedAt = Date.now();
    const proposed: ChargeableEntry[] = nominationIds.map(
      (nominationId, index) => ({
        id: `${QUOTE_ROW_ID_PREFIX}${index}`,
        createdAt: new Date(submittedAt + index),
        nominationId,
        participantIds,
        participantsCount: participantIds.length,
        extraFee: 0,
      }),
    );

    const all = [...history, ...proposed];
    const pricing = await this.loadPricing(all);
    for (const { nominationId } of proposed) {
      if (pricing.get(nominationId as string)?.competitionId !== competitionId) {
        throw new BadRequestException(NOMINATION_NOT_IN_COMPETITION_MESSAGE);
      }
    }
    const charges = this.calculator.calculate(all, pricing);
    return proposed.map((p) => (charges.get(p.id) as EntryCharge).amount);
  }
```

- [ ] **Step 5: `EntriesService.quote`** (imports `QuoteEntriesDto`, `EntriesQuote`, `roundMoney`)

```ts
  async quote(
    competitionId: string,
    dto: QuoteEntriesDto,
    user: AuthenticatedUser,
  ): Promise<EntriesQuote> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    const staff = await this.isCompetitionStaff(
      competition,
      user.id,
      user.accessLevel,
    );
    if (!staff) {
      const own = new Set(await this.ownParticipantIds(user));
      if (dto.participantIds.some((id) => !own.has(id))) {
        throw new ForbiddenException(NOT_OWN_PARTICIPANT_MESSAGE);
      }
    }
    const amounts = await this.entryChargeService.quote(
      competitionId,
      dto.participantIds,
      dto.nominationIds,
    );
    return {
      amounts,
      total: amounts.reduce((sum, amount) => roundMoney(sum + amount), 0),
    };
  }
```

- [ ] **Step 6: Controller** — add before `@Delete(':entryId')`:

```ts
  @ApiOperation({
    summary: 'Price nominations for dancers before submitting',
    description:
      'Applies the pay-once rule for special nominations sharing a name, ' +
      'counting the dancers\' existing entries in this competition.',
  })
  @ApiResponse({ status: 201, description: 'Amounts per requested nomination.' })
  @ApiResponse({ status: 400, description: 'Validation failed, or a nomination is not in this competition.' })
  @ApiResponse({ status: 403, description: 'A dancer is not yours.' })
  @ApiResponse({ status: 404, description: 'No competition exists with the given id.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('quote')
  quote(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: QuoteEntriesDto,
  ) {
    return this.entriesService.quote(competitionId, dto, user);
  }
```

- [ ] **Step 7: Type-check** — `cd backend && npx tsc --noEmit -p tsconfig.json`.

---

### Task 7: Frontend — send `specialName`, explain the shared price to admins

**Files:**
- Modify: `frontend/src/lib/nominations.ts` (`Nomination` ~37-56, `NominationInput` ~58-70), `frontend/src/pages/NewCompetitionPage.tsx` (~588-597), `frontend/src/components/admin/NominationsPanel.tsx` (`handleAddSpecial` ~202-218, row block ~333-337), `frontend/src/components/admin/nominationSelection/nominationFilters.constants.ts`

**Interfaces:**
- Produces: `Nomination.specialName: string | null`; `NominationInput.specialName?: string`.

- [ ] **Step 1: Types** — in `lib/nominations.ts` add `specialName: string | null;` to `Nomination` after `isSpecial`, and `specialName?: string;` to `NominationInput` after `isSpecial`.

- [ ] **Step 2: Wizard payload** — in `NewCompetitionPage.tsx` add `specialName: n.specialName,` after `isSpecial: n.isSpecial,` in `nominationInputs` (`DraftNomination.specialName` already exists).

- [ ] **Step 3: Panel payload** — in `handleAddSpecial` add `specialName: d.specialName,` after `isSpecial: d.isSpecial,`.

- [ ] **Step 4: Shared-price hint** — append to `nominationFilters.constants.ts`:

```ts
export const SPECIAL_PRICE_SHARED_HINT = 'Ціна діє для всіх спеціальних номінацій';
```
  import it in `NominationsPanel.tsx` (next to `SELECT_NOMINATION_ARIA_PREFIX`) and, right after the `Програми підряд` hint block (line ~337), add:

```tsx
          {nomination.isSpecial && nomination.specialName && (
            <div className={styles.rowHint}>
              {SPECIAL_PRICE_SHARED_HINT} «{nomination.specialName}»
            </div>
          )}
```
  Saving a price already invalidates the nominations cache (`nominationsCache.ts`), so sibling rows show the synced price after the mutation.

- [ ] **Step 5: Type-check** — `cd frontend && npx tsc -b`.

---

### Task 8: Frontend — apply form takes the total from the server

**Files:**
- Create: `frontend/src/lib/entriesQuote.types.ts`, `frontend/src/lib/entriesQuote.constants.ts`, `frontend/src/lib/useEntriesQuote.ts`
- Modify: `frontend/src/lib/entries.ts` (after `createEntriesBulk`, ~270), `frontend/src/pages/ApplyPage.tsx` (import line 25; rows/total 406-427; special row price ~1119-1122; total box ~1225-1228), `frontend/src/lib/entryAmount.ts`, `frontend/src/lib/entryAmount.constants.ts`

**Interfaces:**
- Consumes: `POST .../entries/quote` (Task 6).
- Produces: `getEntriesQuote(competitionId, input): Promise<EntriesQuote>`; hook `useEntriesQuote(competitionId, participantIds, nominationIds): EntriesQuoteState`.

- [ ] **Step 1: `entriesQuote.types.ts`**

```ts
export interface EntriesQuoteInput {
  participantIds: string[];
  nominationIds: string[];
}

export interface EntriesQuote {
  amounts: number[];
  total: number;
}

export type EntriesQuoteState =
  | { status: 'idle' }
  | { status: 'ready'; amounts: number[]; total: number }
  | { status: 'failed' };
```

- [ ] **Step 2: `entriesQuote.constants.ts`**

```ts
export const QUOTE_KEY_SEPARATOR = ',';
// Shown on a special row whose price is already covered by another selected
// or earlier entry of the same dancer.
export const SPECIAL_PAID_ONCE_LABEL = 'оплата один раз';
```

- [ ] **Step 3: API call** — in `lib/entries.ts` (import the two types):

```ts
// What each selected nomination costs these dancers, counting what they
// already registered for — the pay-once rule lives only on the server.
export function getEntriesQuote(
  competitionId: string,
  input: EntriesQuoteInput,
): Promise<EntriesQuote> {
  return request<EntriesQuote>(`/competitions/${competitionId}/entries/quote`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}
```

- [ ] **Step 4: `useEntriesQuote.ts`** (the effect depends on the joined-id keys, so arrays created on every render do not refire it)

```ts
import { useEffect, useState } from 'react';
import { getEntriesQuote } from './entries';
import { QUOTE_KEY_SEPARATOR } from './entriesQuote.constants';
import type { EntriesQuoteState } from './entriesQuote.types';

const IDLE: EntriesQuoteState = { status: 'idle' };
const FAILED: EntriesQuoteState = { status: 'failed' };

export function useEntriesQuote(
  competitionId: string | undefined,
  participantIds: string[],
  nominationIds: string[],
): EntriesQuoteState {
  const [state, setState] = useState<EntriesQuoteState>(IDLE);
  const participantsKey = participantIds.join(QUOTE_KEY_SEPARATOR);
  const nominationsKey = nominationIds.join(QUOTE_KEY_SEPARATOR);

  useEffect(() => {
    if (!competitionId || !participantsKey || !nominationsKey) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    getEntriesQuote(competitionId, {
      participantIds: participantsKey.split(QUOTE_KEY_SEPARATOR),
      nominationIds: nominationsKey.split(QUOTE_KEY_SEPARATOR),
    })
      .then((quote) => {
        if (!cancelled) setState({ status: 'ready', ...quote });
      })
      .catch(() => {
        if (!cancelled) setState(FAILED);
      });
    return () => {
      cancelled = true;
    };
  }, [competitionId, participantsKey, nominationsKey]);

  return state;
}
```

- [ ] **Step 5: `ApplyPage.tsx`** —
  1. Line 25: `import { formatEntryAmount } from '../lib/entryAmount';` and add `import { useEntriesQuote } from '../lib/useEntriesQuote';` and `import { SPECIAL_PAID_ONCE_LABEL } from '../lib/entriesQuote.constants';`.
  2. Add `isSpecial: boolean;` to `NominationRow` and set `isSpecial: false` on the two style rows / `isSpecial: true` on `specialRows` rows.
  3. Replace the `total` reduction (lines 424-427) with:

```ts
  const quote = useEntriesQuote(
    id,
    effectiveParticipantIds,
    selectedRows.map((r) => r.nominationId),
  );
  const quoteAmountByKey = new Map(
    quote.status === 'ready'
      ? selectedRows.map((r, index) => [r.key, quote.amounts[index]])
      : [],
  );
  const total = quote.status === 'ready' ? quote.total : null;
```
     (`id` is the competition id from `useParams`; use the variable name the page already uses for it.)
  4. In the special-rows map, replace `{formatEntryAmount(row.price)}` with:

```tsx
                        {on &&
                        row.price !== null &&
                        row.price > 0 &&
                        quoteAmountByKey.get(row.key) === 0
                          ? SPECIAL_PAID_ONCE_LABEL
                          : formatEntryAmount(row.price)}
```
  5. The «Сума до сплати» box keeps `formatEntryAmount(total)` — `formatEntryAmount(null)` already renders the placeholder dash until a participant is picked.

- [ ] **Step 6: Remove the mirrored formula** — delete `entryCostForDancers` from `lib/entryAmount.ts` and `ENTRY_MIN_DANCERS` from `lib/entryAmount.constants.ts` (both become unused; verify with `grep -rn "entryCostForDancers\|ENTRY_MIN_DANCERS" frontend/src`).

- [ ] **Step 7: Type-check** — `cd frontend && npx tsc -b`.

---

### Task 9: Final verification and hand-off

- [ ] **Step 1:** `cd backend && npx tsc --noEmit -p tsconfig.json` and `cd frontend && npx tsc -b` both clean.
- [ ] **Step 2: Hand-off note for the Developer (she tests herself):**
  - Run `npm run migrate` in `backend/`; read the `[special-name]` log lines: names taken from labels (no template) and price groups that were aligned to the maximum.
  - Manual scenarios: (a) one dancer, 2 «Корона» rows → total = 1 price, second row shows «оплата один раз»; (b) second dancer of the same trainer, 1 «Корона» → pays a full price; (c) dancer submits one «Корона» now and another later → the later row is 0 in «Мої заявки», Фінанси and the entries list; (d) edit the price of one «Корона» in the panel → all «Корона» rows show the new price; (e) `per_program` special with two exits → charged once.
  - Not covered on purpose: two admins writing the same name's price at the same instant (last write wins; the next write realigns the group). Existing competitions' totals change retroactively because amounts are computed live — that is the fix for the earlier double charging.
- [ ] **Step 3:** No commit — only on the Developer's request.

---

## Self-review

- **Spec coverage:** per-dancer rule → Task 4 (`byCreationOrder`, `paidByGroup`); another dancer of the same trainer pays → group key has no trainer, dedupe set is per group and per dancer; one price per name → Tasks 1 (backfill + align) and 3 (write path); existing DB → Task 1 (idempotent, guarded, logged); backend totals in all 5 places + finance → Task 5; frontend correctness incl. dancer's earlier entries → Tasks 6, 8; `per_program` double exits → same group key (Task 4 rule).
- **Placeholder scan:** none; every code step has code. Two spots depend on reading existing code at edit time: the name of the competition-id variable in `ApplyPage` (Task 8 step 5.3) and exact insertion line numbers (approximate).
- **Type consistency:** `NominationPricing.specialGroupKey` (Task 2) is read as `specialGroupKey` in Task 4; `EntryCharge.amount`/`shareOf` used identically in Tasks 5–6; `EntriesQuote` back-end shape `{amounts,total}` matches the frontend type in Task 8; `forCompleteScope`/`withDancerHistory`/`quote` names match across Tasks 5–6.
