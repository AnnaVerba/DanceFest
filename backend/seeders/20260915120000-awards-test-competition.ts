import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';
import type { Transaction } from 'sequelize';
import { randomUUID } from 'crypto';

// Повний конкурс для перевірки блоку «Нагородна продукція»: програму вже
// сформовано, і в ній є все, що рахує калькулятор нагород — категорії, де
// медальний залік змінює кількість медалей (7 соло, 4 дуети), ліги «медаль
// кожному» («Дебют», «Перші кроки»), тріо з двох номерів, групи й формейшн
// (кубки + медалі за участь) і спецномінація з двох категорій. Кожен
// танцюрист виступає в номінації лише один раз.
//
// Власник — наявний адміністратор або організатор, чию пошту передають
// змінною середовища:
//   SEED_OWNER_EMAIL=you@example.com npx sequelize-cli db:seed --seed 20260915120000-awards-test-competition.ts
//
// Очікувані цифри (звичайний режим → медальний залік):
//   медалі за 1 місце 11 → 16, за 2 місце 10 → 12, за 3 місце 6 → 7;
//   медалі за участь 41; кубки «Група» 3, «Формейшн» 2; дипломи 76;
//   «Корона Сходу» — 2 переможці, 7 участей; номерів у програмі 39.

const OWNER_EMAIL_ENV = 'SEED_OWNER_EMAIL';
const OWNER_ACCESS_LEVELS = ['ADMIN', 'ORGANIZER'];
const PARTICIPANT_ACCESS_LEVEL = 'PARTICIPANT';

const COMPETITION_ID = '55555555-5555-4555-8555-555555555555';
const TEMPLATE_ID = '66666666-6666-4666-8666-666666666666';
const DAY_ID = '77777777-7777-4777-8777-777777777777';

const COMPETITION = {
  name: 'Тест нагород 2026',
  description:
    'Тестовий конкурс зі сформованою програмою для перевірки нагородної продукції та медального заліку.',
  location: 'Київ, Будинок культури',
  organizers: ['Тестова студія'],
  dateFrom: '2026-10-10',
  dateTo: '2026-10-10',
  registrationFrom: '2026-08-01',
  registrationTo: '2026-09-10',
  contactNumber: '+380500000000',
  contactEmail: 'awards-test@dansefest.local',
};

const TEMPLATE_NAME = 'Тест нагород';
const TEMPLATE_DESCRIPTION =
  'Вік × ліга × склад. У лігах «Дебют» і «Перші кроки» медаль за місце отримує кожен номер.';

const SEPARATOR = ' · ';
const ROUTINE_SEPARATOR = ', ';
const SINGLE_EXIT_MODE = 'single';
const PERFORMANCE_ITEM = 'performance';
const AWARD_ITEM = 'award';
const PERFORMANCE_SECONDS = 180;
const PAUSE_SECONDS = 20;

const AGE_TYPE = 'age';
const LEVEL_TYPE = 'level';
const LINEUP_TYPE = 'lineup';

const KIDS = 'Кідс';
const ADULTS = 'Дорослі';
const DEBUT = 'Дебют';
const FIRST_STEPS = 'Перші кроки';
const PRO = 'ПРОФІ';
const ALL_MEDAL_LEAGUES = [DEBUT, FIRST_STEPS];

const SOLO = 'Соло';
const DUET = 'Дует';
const TRIO = 'Тріо';
const GROUP = 'Група';
const FORMATION = 'Формейшн';

// Як у LINEUP_LABELS заявок: склад номера за кількістю танцюристів.
const ENTRY_LINEUP_SOLO = 'Соло';
const ENTRY_LINEUP_DUO = 'Дуо';
const ENTRY_LINEUP_TRIO = 'Тріо';
const ENTRY_LINEUP_GROUP = 'Група';
const DUO_DANCERS = 2;
const TRIO_DANCERS = 3;
const GROUP_MIN_DANCERS = 4;

const SPECIAL_NAME = 'Корона Сходу';

const DANCER_PHONE_PREFIX = 'seed-awards-';
const DANCER_PHONE_DIGITS = 3;
const DANCER_PHONE_PAD = '0';
const DANCER_FIRST_NAME = 'Тест';
const DANCER_LAST_NAME_PREFIX = 'Нагороди';
const GROUP_ROUTINE_PREFIX = 'Колектив №';
const BIRTH_DATES: Record<string, string> = {
  [KIDS]: '2016-06-01',
  [ADULTS]: '1998-06-01',
};

const STUDIO_NAME = 'Студія «Тест»';
const CITY = 'Київ';
const PAYMENT_METHOD = 'card';
const FIRST_NUMBER = 1;

const SECTIONS = [
  { name: 'Відділення 1 · Кідс', startTime: '10:00' },
  { name: 'Відділення 2 · Дорослі', startTime: '14:00' },
];
const KIDS_SECTION = 0;
const ADULTS_SECTION = 1;

interface NominationPlan {
  age: string;
  league: string;
  // Лінійна категорія номінації; null — у спецномінації її немає.
  lineup: string | null;
  special: boolean;
  // Скільки танцюристів у кожному номері.
  dancersPerPerformance: number[];
  section: number;
}

const PLANS: NominationPlan[] = [
  // 7 соло: 1/1/1 → 3/2/2.
  { age: KIDS, league: PRO, lineup: SOLO, special: false, dancersPerPerformance: [1, 1, 1, 1, 1, 1, 1], section: KIDS_SECTION },
  // 2 тріо: 1/1/0 номерів у будь-якому режимі, по 3 медалі на номер.
  { age: KIDS, league: PRO, lineup: TRIO, special: false, dancersPerPerformance: [3, 3], section: KIDS_SECTION },
  // «Медаль кожному»: 2/2/1 в обох режимах.
  { age: KIDS, league: DEBUT, lineup: SOLO, special: false, dancersPerPerformance: [1, 1, 1, 1, 1], section: KIDS_SECTION },
  // «Медаль кожному»: 2/1/1 в обох режимах.
  { age: KIDS, league: FIRST_STEPS, lineup: SOLO, special: false, dancersPerPerformance: [1, 1, 1, 1], section: KIDS_SECTION },
  { age: KIDS, league: PRO, lineup: null, special: true, dancersPerPerformance: [1, 1, 1], section: KIDS_SECTION },
  // 5 соло: 1/1/1 → 2/2/1.
  { age: ADULTS, league: PRO, lineup: SOLO, special: false, dancersPerPerformance: [1, 1, 1, 1, 1], section: ADULTS_SECTION },
  // 4 дуети по 2 медалі: 2/2/2 → 4/2/2.
  { age: ADULTS, league: PRO, lineup: DUET, special: false, dancersPerPerformance: [2, 2, 2, 2], section: ADULTS_SECTION },
  { age: ADULTS, league: PRO, lineup: GROUP, special: false, dancersPerPerformance: [5, 6, 8], section: ADULTS_SECTION },
  { age: ADULTS, league: DEBUT, lineup: FORMATION, special: false, dancersPerPerformance: [10, 12], section: ADULTS_SECTION },
  { age: ADULTS, league: PRO, lineup: null, special: true, dancersPerPerformance: [1, 1, 1, 1], section: ADULTS_SECTION },
];

const CATEGORIES: { name: string; type: string }[] = [
  { name: KIDS, type: AGE_TYPE },
  { name: ADULTS, type: AGE_TYPE },
  { name: DEBUT, type: LEVEL_TYPE },
  { name: FIRST_STEPS, type: LEVEL_TYPE },
  { name: PRO, type: LEVEL_TYPE },
  { name: SOLO, type: LINEUP_TYPE },
  { name: DUET, type: LINEUP_TYPE },
  { name: TRIO, type: LINEUP_TYPE },
  { name: GROUP, type: LINEUP_TYPE },
  { name: FORMATION, type: LINEUP_TYPE },
];

interface CategoryRow {
  id: string;
  name: string;
  type: string;
}

interface Dancer {
  id: string;
  lastName: string;
}

interface SeededEntry {
  id: string;
  nominationId: string;
  section: number;
}

interface ItemRow {
  sectionId: string;
  entryId: string | null;
  type: string;
  nominationGroupKey: string | null;
  durationSeconds: number | null;
  sortOrder: number;
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
    const byCompetition = { replacements: { competitionId: COMPETITION_ID } };
    await queryInterface.sequelize.query(
      `DELETE FROM section_items WHERE "sectionId" IN
         (SELECT id FROM sections WHERE "competitionId" = :competitionId)`,
      byCompetition,
    );
    for (const table of [
      'sections',
      'competition_days',
      'competition_participant_numbers',
      'award_settings',
      'entries',
      'nominations',
    ]) {
      await queryInterface.sequelize.query(
        `DELETE FROM ${table} WHERE "competitionId" = :competitionId`,
        byCompetition,
      );
    }
    await queryInterface.sequelize.query(
      `DELETE FROM competitions WHERE id = :competitionId`,
      byCompetition,
    );
    const byTemplate = { replacements: { templateId: TEMPLATE_ID } };
    await queryInterface.sequelize.query(
      `DELETE FROM template_nominations WHERE "templateId" = :templateId`,
      byTemplate,
    );
    await queryInterface.sequelize.query(
      `DELETE FROM category_templates WHERE id = :templateId`,
      byTemplate,
    );
    await queryInterface.sequelize.query(
      `DELETE FROM users WHERE phone LIKE :prefix`,
      { replacements: { prefix: `${DANCER_PHONE_PREFIX}%` } },
    );
  },
};

async function seed(
  queryInterface: QueryInterface,
  now: Date,
  transaction: Transaction,
): Promise<void> {
  const ownerId = await findOwnerId(queryInterface, transaction);

  // Категорія вставляється лише тоді, коли такої назви на цій осі ще немає.
  for (const category of CATEGORIES) {
    await queryInterface.sequelize.query(
      `INSERT INTO categories (id, name, "type", "createdAt", "updatedAt")
         SELECT :id, :name, CAST(:type AS "enum_categories_type"), :now, :now
          WHERE NOT EXISTS (
            SELECT 1 FROM categories
             WHERE lower(btrim(name)) = lower(btrim(:name))
               AND "type" = CAST(:type AS "enum_categories_type")
          )`,
      {
        transaction,
        replacements: {
          id: randomUUID(),
          name: category.name,
          type: category.type,
          now,
        },
      },
    );
  }
  const categories = await queryInterface.sequelize.query<CategoryRow>(
    `SELECT id, name, "type" FROM categories WHERE lower(btrim(name)) IN (:names)`,
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: { names: CATEGORIES.map((c) => c.name.toLowerCase()) },
    },
  );
  const categoryId = (name: string, type: string): string => {
    const row = categories.find(
      (c) => c.type === type && c.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (!row) throw new Error(`Категорію «${name}» не знайдено після вставки`);
    return row.id;
  };

  await queryInterface.sequelize.query(
    `INSERT INTO competitions
         (id, name, description, location, organizers, "dateFrom", "dateTo",
          "registrationFrom", "registrationTo", "contactNumber", "contactEmail",
          "ownerId", "createdAt", "updatedAt")
       VALUES (:id, :name, :description, :location, CAST(ARRAY[:organizers] AS varchar[]),
               :dateFrom, :dateTo, :registrationFrom, :registrationTo,
               :contactNumber, :contactEmail, :ownerId, :now, :now)`,
    {
      transaction,
      replacements: { id: COMPETITION_ID, ...COMPETITION, ownerId, now },
    },
  );

  await queryInterface.sequelize.query(
    `INSERT INTO category_templates
         (id, name, description, "isPublic", "authorId", "allMedalLeagues",
          "createdAt", "updatedAt")
       VALUES (:id, :name, :description, false, :authorId,
               CAST(ARRAY[:leagues] AS varchar[]), :now, :now)`,
    {
      transaction,
      replacements: {
        id: TEMPLATE_ID,
        name: TEMPLATE_NAME,
        description: TEMPLATE_DESCRIPTION,
        authorId: ownerId,
        leagues: ALL_MEDAL_LEAGUES,
        now,
      },
    },
  );

  const entries: SeededEntry[] = [];
  let dancerCount = 0;
  let entryNumber = FIRST_NUMBER;

  for (const [planIndex, plan] of PLANS.entries()) {
    const categoryIds = [
      categoryId(plan.age, AGE_TYPE),
      categoryId(plan.league, LEVEL_TYPE),
      ...(plan.lineup ? [categoryId(plan.lineup, LINEUP_TYPE)] : []),
    ];
    const name = plan.special
      ? [SPECIAL_NAME, plan.age, plan.league].join(SEPARATOR)
      : [plan.age, plan.league, plan.lineup].join(SEPARATOR);

    // Шаблонна номінація має ті самі categoryIds: звіт нагород знаходить
    // «голу» назву спецномінації саме за парою (templateId, categoryIds).
    await queryInterface.sequelize.query(
      `WITH created AS (
           INSERT INTO template_nominations
             (id, "templateId", name, "allowsImprovisation",
              "isSpecial", "specialName", "exitMode", "sortOrder",
              "createdAt", "updatedAt")
           VALUES (:id, :templateId, :name, false,
                   :isSpecial, :specialName,
                   CAST(:exitMode AS "enum_template_nominations_exitMode"),
                   :sortOrder, :now, :now)
           RETURNING id
         )
         INSERT INTO template_nomination_categories
           (id, "templateNominationId", "categoryId", "createdAt", "updatedAt")
         SELECT gen_random_uuid(), created.id, axis, :now, :now
           FROM created, unnest(CAST(ARRAY[:categoryIds] AS uuid[])) AS axis`,
      {
        transaction,
        replacements: {
          id: randomUUID(),
          templateId: TEMPLATE_ID,
          name,
          categoryIds,
          isSpecial: plan.special,
          specialName: plan.special ? SPECIAL_NAME : null,
          exitMode: SINGLE_EXIT_MODE,
          sortOrder: planIndex,
          now,
        },
      },
    );

    const nominationId = randomUUID();
    await queryInterface.sequelize.query(
      `WITH created AS (
           INSERT INTO nominations
             (id, "competitionId", "templateId", name, "allowsImprovisation",
              "isSpecial", "exitMode", "programLimits",
              "createdAt", "updatedAt")
           VALUES (:id, :competitionId, :templateId, :name, false,
                   :isSpecial,
                   CAST(:exitMode AS "enum_nominations_exitMode"),
                   CAST('{}' AS jsonb), :now, :now)
           RETURNING id
         )
         INSERT INTO nomination_categories
           (id, "nominationId", "categoryId", "createdAt", "updatedAt")
         SELECT gen_random_uuid(), created.id, axis, :now, :now
           FROM created, unnest(CAST(ARRAY[:categoryIds] AS uuid[])) AS axis`,
      {
        transaction,
        replacements: {
          id: nominationId,
          competitionId: COMPETITION_ID,
          templateId: TEMPLATE_ID,
          name,
          categoryIds,
          isSpecial: plan.special,
          exitMode: SINGLE_EXIT_MODE,
          now,
        },
      },
    );

    const performances: Dancer[][] = [];
    for (const size of plan.dancersPerPerformance) {
      const dancers: Dancer[] = [];
      for (let i = 0; i < size; i += 1) {
        dancerCount += 1;
        dancers.push(
          await insertDancer(queryInterface, transaction, now, dancerCount, plan.age),
        );
      }
      performances.push(dancers);
    }

    for (const dancers of performances) {
      const id = randomUUID();
      const participantIds = dancers.map((d) => d.id);
      await queryInterface.sequelize.query(
        `INSERT INTO entries
             (id, "competitionId", "nominationId", number, "routineName",
              nomination, "ageCategory", league, "participantsCount", lineup,
              "participantId", "participantIds", "studioName", city, improv,
              "paymentMethod", "submittedByUserId", "createdAt", "updatedAt")
           VALUES (:id, :competitionId, :nominationId, :number, :routineName,
                   :nomination, :ageCategory, :league, :participantsCount, :lineup,
                   :participantId, CAST(ARRAY[:participantIds] AS uuid[]),
                   :studioName, :city, false, :paymentMethod, :submittedBy,
                   :now, :now)`,
        {
          transaction,
          replacements: {
            id,
            competitionId: COMPETITION_ID,
            nominationId,
            number: entryNumber,
            routineName:
              dancers.length >= GROUP_MIN_DANCERS
                ? `${GROUP_ROUTINE_PREFIX}${entryNumber}`
                : dancers.map((d) => d.lastName).join(ROUTINE_SEPARATOR),
            nomination: name,
            ageCategory: plan.age,
            league: plan.league,
            participantsCount: dancers.length,
            lineup: entryLineup(dancers.length),
            participantId: participantIds[0],
            participantIds,
            studioName: STUDIO_NAME,
            city: CITY,
            paymentMethod: PAYMENT_METHOD,
            submittedBy: ownerId,
            now,
          },
        },
      );
      entries.push({ id, nominationId, section: plan.section });
      entryNumber += 1;
    }
  }

  await queryInterface.sequelize.query(
    `INSERT INTO competition_participant_numbers
         (id, "competitionId", "personId", number, "createdAt", "updatedAt")
       SELECT gen_random_uuid(), :competitionId, u.id,
              row_number() OVER (ORDER BY u.phone), :now, :now
         FROM users u WHERE u.phone LIKE :prefix`,
    {
      transaction,
      replacements: {
        competitionId: COMPETITION_ID,
        prefix: `${DANCER_PHONE_PREFIX}%`,
        now,
      },
    },
  );

  await queryInterface.sequelize.query(
    `INSERT INTO competition_days (id, "competitionId", date, "createdAt", "updatedAt")
       VALUES (:id, :competitionId, :date, :now, :now)`,
    {
      transaction,
      replacements: {
        id: DAY_ID,
        competitionId: COMPETITION_ID,
        date: COMPETITION.dateFrom,
        now,
      },
    },
  );

  for (const [sectionIndex, section] of SECTIONS.entries()) {
    const sectionId = randomUUID();
    await queryInterface.sequelize.query(
      `INSERT INTO sections
           (id, "competitionId", "dayId", name, "startTime", "pauseSeconds",
            "sortOrder", "createdAt", "updatedAt")
         VALUES (:id, :competitionId, :dayId, :name, :startTime, :pauseSeconds,
                 :sortOrder, :now, :now)`,
      {
        transaction,
        replacements: {
          id: sectionId,
          competitionId: COMPETITION_ID,
          dayId: DAY_ID,
          name: section.name,
          startTime: section.startTime,
          pauseSeconds: PAUSE_SECONDS,
          sortOrder: sectionIndex,
          now,
        },
      },
    );

    const sectionEntries = entries.filter((e) => e.section === sectionIndex);
    for (const [sortOrder, entry] of sectionEntries.entries()) {
      await insertItem(queryInterface, transaction, now, {
        sectionId,
        entryId: entry.id,
        type: PERFORMANCE_ITEM,
        nominationGroupKey: entry.nominationId,
        durationSeconds: PERFORMANCE_SECONDS,
        sortOrder,
      });
    }
    await insertItem(queryInterface, transaction, now, {
      sectionId,
      entryId: null,
      type: AWARD_ITEM,
      nominationGroupKey: null,
      durationSeconds: null,
      sortOrder: sectionEntries.length,
    });
  }
}

async function insertItem(
  queryInterface: QueryInterface,
  transaction: Transaction,
  now: Date,
  item: ItemRow,
): Promise<void> {
  await queryInterface.sequelize.query(
    `INSERT INTO section_items
         (id, "sectionId", "entryId", "type", "nominationGroupKey",
          "durationSeconds", "sortOrder", "createdAt", "updatedAt")
       VALUES (:id, :sectionId, :entryId, CAST(:type AS "enum_section_items_type"),
               :nominationGroupKey, :durationSeconds, :sortOrder, :now, :now)`,
    { transaction, replacements: { id: randomUUID(), ...item, now } },
  );
}

async function findOwnerId(
  queryInterface: QueryInterface,
  transaction: Transaction,
): Promise<string> {
  const email = process.env[OWNER_EMAIL_ENV];
  if (!email) {
    throw new Error(`Вкажіть пошту власника конкурсу у змінній ${OWNER_EMAIL_ENV}`);
  }
  const [owner] = await queryInterface.sequelize.query<{ id: string }>(
    `SELECT id FROM users
      WHERE lower(email) = lower(:email)
        AND "accessLevel" IN (:levels)`,
    {
      type: QueryTypes.SELECT,
      transaction,
      replacements: { email, levels: OWNER_ACCESS_LEVELS },
    },
  );
  if (!owner) {
    throw new Error(`Адміністратора чи організатора з поштою ${email} не знайдено`);
  }
  return owner.id;
}

async function insertDancer(
  queryInterface: QueryInterface,
  transaction: Transaction,
  now: Date,
  index: number,
  age: string,
): Promise<Dancer> {
  const id = randomUUID();
  const lastName = `${DANCER_LAST_NAME_PREFIX} ${index}`;
  await queryInterface.sequelize.query(
    `INSERT INTO users
         (id, phone, "firstName", "lastName", "birthDate", "accessLevel",
          confirmed, "createdAt", "updatedAt")
       VALUES (:id, :phone, :firstName, :lastName, :birthDate,
               CAST(:accessLevel AS "enum_users_accessLevel"), true, :now, :now)`,
    {
      transaction,
      replacements: {
        id,
        // Доповнено нулями, щоб ORDER BY phone нумерував танцюристів у порядку створення.
        phone: `${DANCER_PHONE_PREFIX}${String(index).padStart(DANCER_PHONE_DIGITS, DANCER_PHONE_PAD)}`,
        firstName: DANCER_FIRST_NAME,
        lastName,
        birthDate: BIRTH_DATES[age],
        accessLevel: PARTICIPANT_ACCESS_LEVEL,
        now,
      },
    },
  );
  return { id, lastName };
}

function entryLineup(dancers: number): string {
  if (dancers >= GROUP_MIN_DANCERS) return ENTRY_LINEUP_GROUP;
  if (dancers === TRIO_DANCERS) return ENTRY_LINEUP_TRIO;
  if (dancers === DUO_DANCERS) return ENTRY_LINEUP_DUO;
  return ENTRY_LINEUP_SOLO;
}
