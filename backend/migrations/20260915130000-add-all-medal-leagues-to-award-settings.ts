import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Ліги «медаль кожному», змінені організатором лише для одного конкурсу.
// NULL — брати позначки з шаблону категорій; сам шаблон не змінюється.
const TABLE = 'award_settings';
const COLUMN = 'allMedalLeagues';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
