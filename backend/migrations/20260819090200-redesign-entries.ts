import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';

module.exports = {
  // Форма подачі заявки не збирає ageCategory/league/program/studioName/
  // choreographer — робимо їх необов'язковими замість NOT NULL, і додаємо
  // поля, які форма реально відправляє. Поле score прибираємо: тепер це
  // агрегат з entry_scores (оцінки суддів), а не єдина колонка, яку
  // перезаписував би будь-який суддя.
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);

    for (const column of [
      'ageCategory',
      'league',
      'program',
      'studioName',
      'choreographer',
    ]) {
      await queryInterface.changeColumn(TABLE, column, {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!table.city) {
      await queryInterface.addColumn(TABLE, 'city', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
    if (!table.improv) {
      await queryInterface.addColumn(TABLE, 'improv', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!table.paymentMethod) {
      await queryInterface.addColumn(TABLE, 'paymentMethod', {
        type: DataTypes.ENUM('cash', 'card'),
        allowNull: true,
      });
    }
    if (table.score) {
      await queryInterface.removeColumn(TABLE, 'score');
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table.city) await queryInterface.removeColumn(TABLE, 'city');
    if (table.improv) await queryInterface.removeColumn(TABLE, 'improv');
    if (table.paymentMethod) {
      await queryInterface.removeColumn(TABLE, 'paymentMethod');
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_entries_paymentMethod"',
      );
    }
    if (!table.score) {
      await queryInterface.addColumn(TABLE, 'score', {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
      });
    }
    for (const column of [
      'ageCategory',
      'league',
      'program',
      'studioName',
      'choreographer',
    ]) {
      await queryInterface.changeColumn(TABLE, column, {
        type: DataTypes.STRING,
        allowNull: false,
      });
    }
  },
};
