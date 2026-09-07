import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';
import type { Transaction } from 'sequelize';
import { randomUUID } from 'crypto';


const MOCK_ADMIN_ID = '11111111-1111-4111-8111-111111111111';
const COMPETITION_ID = '22222222-2222-4222-8222-222222222222';

const CATEGORIES: { name: string; type: string }[] = [
  { name: 'Соло', type: 'participants_count' },
  { name: 'Дует', type: 'participants_count' },
  { name: 'Діти', type: 'age' },
  { name: 'Юніори 1', type: 'age' },
  { name: 'Дорослі', type: 'age' },
  { name: 'Дебют', type: 'level' },
  { name: 'Перші кроки', type: 'level' },
  { name: 'Профі', type: 'level' },
  { name: 'Фрі Денс', type: 'discipline' },
  { name: 'Табла', type: 'discipline' },
  { name: 'Класика', type: 'discipline' },
  { name: 'Імпровізація межансе', type: 'discipline' },
];

const SEPARATOR = ' · ';

interface NominationRow {
  id: string;
  competitionId: string;
  name: string;
  price: number | null;
  allowsImprovisation: boolean;
  categoryIds: string[];
  isSpecial: boolean;
  exitMode: 'single' | 'per_program';
  durationLimitSeconds: number | null;
  programLimits: string;
  createdAt: Date;
  updatedAt: Date;
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
    await queryInterface.bulkDelete('entries', {
      competitionId: COMPETITION_ID,
    });
    await queryInterface.bulkDelete('nominations', {
      competitionId: COMPETITION_ID,
    });
    await queryInterface.bulkDelete('competitions', { id: COMPETITION_ID });
  },
};

async function seed(
  queryInterface: QueryInterface,
  now: Date,
  transaction: Transaction,
): Promise<void> {
  for (const category of CATEGORIES) {
    await queryInterface.sequelize.query(
      `INSERT INTO categories (id, name, "type", "createdAt", "updatedAt")
         VALUES (:id, :name, :type, :now, :now)
         ON CONFLICT DO NOTHING`,
      {
        replacements: {
          id: randomUUID(),
          name: category.name,
          type: category.type,
          now,
        },
        transaction,
      },
    );
  }

  const rows = await queryInterface.sequelize.query<{
    id: string;
    name: string;
    type: string;
  }>(
    `SELECT id, name, "type" FROM categories
        WHERE (lower(btrim(name)), "type") IN (${CATEGORIES.map(
          (_, i) => `(lower(btrim(:name${i})), :type${i})`,
        ).join(', ')})`,
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: Object.fromEntries(
        CATEGORIES.flatMap((c, i) => [
          [`name${i}`, c.name],
          [`type${i}`, c.type],
        ]),
      ),
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
    'competitions',
    [
      {
        id: COMPETITION_ID,
        image: null,
        name: 'Перлина Сходу 2026',
        description:
          'Демонстраційний конкурс східного танцю зі звичайною сіткою номінацій і двома спеціальними категоріями.',
        location: 'Львів, Палац культури',
        organizers: ['Студія «Шехеризада»'],
        dateFrom: '2026-11-14',
        dateTo: '2026-11-15',
        registrationFrom: '2026-09-01',
        registrationTo: '2026-11-01',
        contactNumber: '+380501234567',
        contactEmail: 'mock@dansefest.local',
        ownerId: MOCK_ADMIN_ID,
        createdAt: now,
        updatedAt: now,
      },
    ],
    { transaction },
  );

  const nominations: NominationRow[] = [];
  const base = {
    competitionId: COMPETITION_ID,
    createdAt: now,
    updatedAt: now,
  };

  for (const count of ['Соло', 'Дует']) {
    for (const age of ['Діти', 'Юніори 1']) {
      for (const level of ['Дебют', 'Перші кроки']) {
        for (const discipline of ['Фрі Денс', 'Табла']) {
          nominations.push({
            ...base,
            id: randomUUID(),
            name: [count, age, level, discipline].join(SEPARATOR),
            price: 350,
            allowsImprovisation: discipline === 'Табла',
            categoryIds: [count, age, level, discipline].map(idOf),
            isSpecial: false,
            exitMode: 'single',
            durationLimitSeconds: 150,
            programLimits: JSON.stringify({}),
          });
        }
      }
    }
  }

  const crownPrograms = ['Табла', 'Класика', 'Імпровізація межансе'];
  const crownLimits = { Табла: 90, Класика: 120, 'Імпровізація межансе': 60 };
  for (const age of ['Юніори 1', 'Дорослі']) {
    for (const level of ['Перші кроки', 'Профі']) {
      nominations.push({
        ...base,
        id: randomUUID(),
        name: ['Корона Шехеризади', age, level].join(SEPARATOR),
        price: 900,
        allowsImprovisation: false,
        categoryIds: [age, level, ...crownPrograms].map(idOf),
        isSpecial: true,
        exitMode: 'single',
        durationLimitSeconds: null,
        programLimits: JSON.stringify(
          Object.fromEntries(
            crownPrograms.map((p) => [
              idOf(p),
              crownLimits[p as keyof typeof crownLimits],
            ]),
          ),
        ),
      });
    }
  }

  const cupPrograms = ['Табла', 'Класика'];
  const cupId = randomUUID();
  nominations.push({
    ...base,
    id: cupId,
    name: ['Кубок Сходу', 'Дорослі', 'Профі'].join(SEPARATOR),
    price: 1200,
    allowsImprovisation: false,
    categoryIds: ['Дорослі', 'Профі', ...cupPrograms].map(idOf),
    isSpecial: true,
    exitMode: 'per_program',
    durationLimitSeconds: null,
    programLimits: JSON.stringify({
      [idOf('Табла')]: 120,
      [idOf('Класика')]: 150,
    }),
  });

  for (const nomination of nominations) {
    await queryInterface.sequelize.query(
      `INSERT INTO nominations
           (id, "competitionId", name, price, "allowsImprovisation", "categoryIds",
            "isSpecial", "exitMode", "durationLimitSeconds", "programLimits",
            "createdAt", "updatedAt")
         VALUES (:id, :competitionId, :name, :price, :allowsImprovisation,
                 CAST(ARRAY[:categoryIds] AS uuid[]), :isSpecial,
                 CAST(:exitMode AS "enum_nominations_exitMode"),
                 :durationLimitSeconds, CAST(:programLimits AS jsonb),
                 :createdAt, :updatedAt)`,
      { replacements: { ...nomination }, transaction },
    );
  }

  const regular = nominations[0];
  await queryInterface.bulkInsert(
    'entries',
    [
      {
        id: randomUUID(),
        competitionId: COMPETITION_ID,
        nominationId: regular.id,
        number: 1,
        routineName: 'Ранкова зоря',
        nomination: regular.name,
        ageCategory: 'Діти',
        league: 'Дебют',
        program: null,
        participantsCount: 1,
        studioName: 'Шехеризада',
        choreographer: 'Анна Луцкевич',
        city: 'Львів',
        improv: false,
        paymentMethod: 'card',
        score: null,
        createdAt: now,
        updatedAt: now,
      },
      ...cupPrograms.map((program, index) => ({
        id: randomUUID(),
        competitionId: COMPETITION_ID,
        nominationId: cupId,
        number: 2 + index,
        routineName: 'Полум’я пустелі',
        nomination: ['Кубок Сходу', 'Дорослі', 'Профі', program].join(
          SEPARATOR,
        ),
        ageCategory: 'Дорослі',
        league: 'Профі',
        program,
        participantsCount: 2,
        studioName: 'Шехеризада',
        choreographer: 'Анна Луцкевич',
        city: 'Львів',
        improv: false,
        paymentMethod: 'cash',
        score: null,
        createdAt: now,
        updatedAt: now,
      })),
    ],
    { transaction },
  );
}
