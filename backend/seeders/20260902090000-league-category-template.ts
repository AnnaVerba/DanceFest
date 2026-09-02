import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';
import type { Transaction } from 'sequelize';
import { randomUUID } from 'crypto';

// Ліга — не окрема таблиця, а категорія осі 'level' (як і решта критеріїв
// номінацій). Цей сідер заповнює довідник ліг і вікових категорій, а тоді
// збирає з них публічний шаблон, яким організатор може одразу скористатись
// при створенні конкурсу.
const MOCK_ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const TEMPLATE_ID = '33333333-3333-4333-8333-333333333333';

const LEAGUES: { name: string }[] = [
  { name: 'Аматорська ліга' },
  { name: 'Професійна ліга' },
];

const AGE_GROUPS: { name: string; ageFrom: number; ageTo: number }[] = [
  { name: 'Діти', ageFrom: 0, ageTo: 12 },
  { name: 'Дорослі', ageFrom: 13, ageTo: 99 },
];

const SEPARATOR = ' · ';

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
    await queryInterface.bulkDelete('categories', {
      name: [...LEAGUES.map((l) => l.name), ...AGE_GROUPS.map((a) => a.name)],
    });
  },
};

async function seed(
  queryInterface: QueryInterface,
  now: Date,
  transaction: Transaction,
): Promise<void> {
  for (const league of LEAGUES) {
    await queryInterface.sequelize.query(
      `INSERT INTO categories (id, name, "type", "createdAt", "updatedAt")
         VALUES (:id, :name, 'level', :now, :now)
         ON CONFLICT DO NOTHING`,
      { replacements: { id: randomUUID(), name: league.name, now }, transaction },
    );
  }

  for (const age of AGE_GROUPS) {
    await queryInterface.sequelize.query(
      `INSERT INTO categories (id, name, "type", "ageFrom", "ageTo", "createdAt", "updatedAt")
         VALUES (:id, :name, 'age', :ageFrom, :ageTo, :now, :now)
         ON CONFLICT DO NOTHING`,
      {
        replacements: {
          id: randomUUID(),
          name: age.name,
          ageFrom: age.ageFrom,
          ageTo: age.ageTo,
          now,
        },
        transaction,
      },
    );
  }

  const names = [...LEAGUES.map((l) => l.name), ...AGE_GROUPS.map((a) => a.name)];
  const rows = await queryInterface.sequelize.query<{ id: string; name: string }>(
    `SELECT id, name FROM categories
       WHERE lower(btrim(name)) IN (${names
         .map((_, i) => `lower(btrim(:name${i}))`)
         .join(', ')})`,
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: Object.fromEntries(names.map((n, i) => [`name${i}`, n])),
    },
  );

  const idOf = (name: string): string => {
    const row = rows.find(
      (r) => r.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (!row) throw new Error(`Категорію «${name}» не знайдено після вставки`);
    return row.id;
  };

  await queryInterface.bulkInsert(
    'category_templates',
    [
      {
        id: TEMPLATE_ID,
        name: 'Ліги та вік',
        description: 'Базовий шаблон із віковими категоріями та лігами.',
        isPublic: true,
        authorId: MOCK_ADMIN_ID,
        forkedFromId: null,
        createdAt: now,
        updatedAt: now,
      },
    ],
    { transaction },
  );

  let sortOrder = 0;
  for (const age of AGE_GROUPS) {
    for (const league of LEAGUES) {
      await queryInterface.sequelize.query(
        `INSERT INTO template_nominations
             (id, "templateId", name, "allowsImprovisation", "categoryIds",
              "isSpecial", "specialName", "exitMode", "sortOrder",
              "createdAt", "updatedAt")
           VALUES (:id, :templateId, :name, false,
                   CAST(ARRAY[:categoryIds] AS uuid[]), false, NULL,
                   CAST('single' AS "enum_template_nominations_exitMode"),
                   :sortOrder, :now, :now)`,
        {
          replacements: {
            id: randomUUID(),
            templateId: TEMPLATE_ID,
            name: [age.name, league.name].join(SEPARATOR),
            categoryIds: [idOf(age.name), idOf(league.name)],
            sortOrder: sortOrder++,
            now,
          },
          transaction,
        },
      );
    }
  }
}
