import type { QueryInterface, Transaction } from 'sequelize';
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
  transaction: Transaction,
): Promise<SpecialNominationRow[]> {
  return queryInterface.sequelize.query<SpecialNominationRow>(
    `SELECT id, "competitionId", "templateId", name, price, "specialName",
            "categoryIds"::text[] AS "categoryIds"
       FROM nominations
      WHERE "isSpecial" = true
      ORDER BY "createdAt" ASC, id ASC`,
    { type: QueryTypes.SELECT, transaction },
  );
}

async function loadTemplateSpecialNames(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<Map<string, string>> {
  const rows = await queryInterface.sequelize.query<TemplateSpecialRow>(
    `SELECT "templateId", "categoryIds"::text[] AS "categoryIds", "specialName"
       FROM template_nominations
      WHERE "isSpecial" = true
        AND "specialName" IS NOT NULL
        AND btrim("specialName") <> ''`,
    { type: QueryTypes.SELECT, transaction },
  );
  return new Map(
    rows.map((r) => [templateKey(r.templateId, r.categoryIds), r.specialName]),
  );
}

async function backfillSpecialNames(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<void> {
  const rows = await loadSpecialNominations(queryInterface, transaction);
  const templateNames = await loadTemplateSpecialNames(
    queryInterface,
    transaction,
  );

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
      { replacements: { name, ids }, transaction },
    );
  }
  if (fallbackLog.length > 0) {
    console.log(
      `${LOG_PREFIX} назву взято з мітки (шаблону немає), перевірте:\n${fallbackLog.join('\n')}`,
    );
  }
}

async function alignGroupPrices(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<void> {
  const rows = (
    await loadSpecialNominations(queryInterface, transaction)
  ).filter((r) => r.specialName);
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
      {
        replacements: { price: highest, ids: stale.map((m) => m.id) },
        transaction,
      },
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

    // Migrations here are not wrapped in a transaction (see
    // utils/table-exists.ts), and these two steps must not be told apart: a
    // failure partway through price alignment would otherwise leave some
    // groups repriced and the rest untouched, with no way to tell which.
    // The DDL above stays outside — its own guards already make it re-runnable.
    await queryInterface.sequelize.transaction(async (transaction) => {
      await backfillSpecialNames(queryInterface, transaction);
      await alignGroupPrices(queryInterface, transaction);
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('nominations', INDEX_NAME);
    await queryInterface.removeColumn('nominations', 'specialName');
  },
};
