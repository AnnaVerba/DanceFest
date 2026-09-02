import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Вікова категорія учасника визначається автоматично за датою народження, і
// єдине джерело для цього — межі діапазону на самій категорії. Без ageFrom і
// ageTo resolveAgeCategory не має з чим порівнювати.
//
// Заразом значення enum приводяться до кодів осей, якими оперує заявка:
// 'discipline' → 'style', 'participants_count' → 'lineup'. Ключі nominations.parts
// і коди осей мусять збігатись посимвольно, інакше підбір номінації за стилем
// доводиться робити через таблицю відповідностей.
//
// 'direction' лишається недоторканим: жоден екран його не використовує, але
// бекфіл 20260822090400 мапив на нього вісь «Напрямок», тож рядки могли лишитись.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('categories', 'ageFrom', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('categories', 'ageTo', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('categories', 'sortOrder', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_categories_type" RENAME VALUE 'discipline' TO 'style'`,
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_categories_type" RENAME VALUE 'participants_count' TO 'lineup'`,
    );

    // Ціна визначається при генерації номінацій конкурсу, а не в шаблоні:
    // один шаблон обслуговує конкурси з різними цінами. Дві копії ціни
    // розходяться мовчки, тому шаблонна прибирається зовсім.
    await queryInterface.removeColumn('template_nominations', 'price');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('template_nominations', 'price', {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    });

    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_categories_type" RENAME VALUE 'lineup' TO 'participants_count'`,
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_categories_type" RENAME VALUE 'style' TO 'discipline'`,
    );

    await queryInterface.removeColumn('categories', 'sortOrder');
    await queryInterface.removeColumn('categories', 'ageTo');
    await queryInterface.removeColumn('categories', 'ageFrom');
  },
};
