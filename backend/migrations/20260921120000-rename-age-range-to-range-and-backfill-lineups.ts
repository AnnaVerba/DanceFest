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
const LINEUP_BACKFILL: { prefixes: string[]; from: number; to: number | null }[] =
  [
    { prefixes: ['соло'], from: 1, to: 1 },
    { prefixes: ['дует', 'дуо'], from: 2, to: 2 },
    { prefixes: ['тріо', 'трио'], from: 3, to: 3 },
    { prefixes: ['груп', 'формейшн', 'ансамбль', 'команд'], from: 3, to: null },
  ];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.renameColumn('categories', 'ageFrom', 'rangeFrom');
    await queryInterface.renameColumn('categories', 'ageTo', 'rangeTo');

    for (const { prefixes, from, to } of LINEUP_BACKFILL) {
      await queryInterface.sequelize.query(
        `UPDATE categories
            SET "rangeFrom" = :from, "rangeTo" = :to
          WHERE "type" = 'lineup'
            AND "rangeFrom" IS NULL
            AND ${prefixes.map((_, i) => `lower(btrim(name)) LIKE :p${i}`).join(' OR ')}`,
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
    await queryInterface.renameColumn('categories', 'rangeFrom', 'ageFrom');
    await queryInterface.renameColumn('categories', 'rangeTo', 'ageTo');
  },
};
