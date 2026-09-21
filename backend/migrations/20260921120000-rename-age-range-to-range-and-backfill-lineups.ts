import type { QueryInterface } from 'sequelize';
import { QueryTypes } from 'sequelize';

// Числова пара на значенні осі описує не лише вік: для складу це кількість
// людей у номері. Колонки перейменовуються на нейтральні до осі, щоб не
// заводити другу пару з тією ж логікою.
//
// `rangeTo = NULL` при заповненому `rangeFrom` означає «без верхньої межі»
// (Група — четверо й більше). Обидві NULL — межі не задані.
//
// Бекфіл дзеркалить чинну евристику по назвах з ApplyPage.lineupMatches
// один в один, зокрема «Група» від ТРЬОХ, а не від чотирьох. Поставити
// сюди 4 означало б мовчки відібрати групові номінації в трійок — це
// окреме рішення, а не побічний ефект перейменування.
const TABLE = 'categories';
const AGE_FROM_COLUMN = 'ageFrom';
const AGE_TO_COLUMN = 'ageTo';
const RANGE_FROM_COLUMN = 'rangeFrom';
const RANGE_TO_COLUMN = 'rangeTo';

const LINEUP_BACKFILL: { prefixes: string[]; from: number; to: number | null }[] =
  [
    { prefixes: ['соло'], from: 1, to: 1 },
    { prefixes: ['дует', 'дуо'], from: 2, to: 2 },
    { prefixes: ['тріо', 'трио'], from: 3, to: 3 },
    { prefixes: ['груп', 'формейшн', 'ансамбль', 'команд'], from: 3, to: null },
  ];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Міграції тут не в транзакції (див. utils/table-exists.ts): якщо
    // попередня спроба впала на бекфілі, перейменування вже застосоване —
    // повтор має його пропустити, а не впасти на неіснуючій колонці.
    const table = await queryInterface.describeTable(TABLE);
    if (table[AGE_FROM_COLUMN]) {
      await queryInterface.renameColumn(
        TABLE,
        AGE_FROM_COLUMN,
        RANGE_FROM_COLUMN,
      );
    }
    if (table[AGE_TO_COLUMN]) {
      await queryInterface.renameColumn(TABLE, AGE_TO_COLUMN, RANGE_TO_COLUMN);
    }

    for (const { prefixes, from, to } of LINEUP_BACKFILL) {
      await queryInterface.sequelize.query(
        `UPDATE categories
            SET "rangeFrom" = :from, "rangeTo" = :to
          WHERE "type" = 'lineup'
            AND "rangeFrom" IS NULL
            AND (${prefixes.map((_, i) => `lower(btrim(name)) LIKE :p${i}`).join(' OR ')})`,
        {
          replacements: {
            from,
            to,
            ...Object.fromEntries(
              prefixes.map((prefix, i) => [`p${i}`, `${prefix}%`]),
            ),
          },
          type: QueryTypes.UPDATE,
        },
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    // Кількість людей жила лише в цих колонках — повертаючи їх віку, чужі
    // значення треба прибрати, інакше склад «Група 3» прикинеться віком.
    await queryInterface.sequelize.query(
      `UPDATE categories SET "rangeFrom" = NULL, "rangeTo" = NULL WHERE "type" = 'lineup'`,
    );
    await queryInterface.renameColumn(
      TABLE,
      RANGE_FROM_COLUMN,
      AGE_FROM_COLUMN,
    );
    await queryInterface.renameColumn(TABLE, RANGE_TO_COLUMN, AGE_TO_COLUMN);
  },
};
