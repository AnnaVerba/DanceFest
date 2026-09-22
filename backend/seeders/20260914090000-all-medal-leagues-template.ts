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

const AGE_GROUPS: { name: string; rangeFrom: number; rangeTo: number }[] = [
  { name: 'Діти', rangeFrom: 0, rangeTo: 12 },
  { name: 'Дорослі', rangeFrom: 13, rangeTo: 99 },
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
  category: { name: string; type: string; rangeFrom?: number; rangeTo?: number },
): Promise<void> {
  await queryInterface.sequelize.query(
    `INSERT INTO categories (id, name, "type", "rangeFrom", "rangeTo", "createdAt", "updatedAt")
       SELECT :id, :name, '${category.type}', :rangeFrom, :rangeTo, :now, :now
        WHERE NOT EXISTS (
          SELECT 1 FROM categories
           WHERE lower(btrim(name)) = lower(btrim(:name))
             AND "type" = '${category.type}'
        )`,
    {
      replacements: {
        id: randomUUID(),
        name: category.name,
        rangeFrom: category.rangeFrom ?? null,
        rangeTo: category.rangeTo ?? null,
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
      rangeFrom: age.rangeFrom,
      rangeTo: age.rangeTo,
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
          `WITH created AS (
               INSERT INTO template_nominations
                 (id, "templateId", name, "allowsImprovisation",
                  "isSpecial", "specialName", "exitMode", "sortOrder",
                  "createdAt", "updatedAt")
               VALUES (:id, :templateId, :name, false,
                       false, NULL,
                       CAST('${SINGLE_EXIT_MODE}' AS "enum_template_nominations_exitMode"),
                       :sortOrder, :now, :now)
               RETURNING id
             )
             INSERT INTO template_nomination_categories
               (id, "templateNominationId", "categoryId", "createdAt", "updatedAt")
             SELECT gen_random_uuid(), created.id, axis, :now, :now
               FROM created, unnest(CAST(ARRAY[:categoryIds] AS uuid[])) AS axis`,
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
