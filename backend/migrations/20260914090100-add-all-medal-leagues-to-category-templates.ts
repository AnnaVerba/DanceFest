import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'category_templates';
const COLUMN = 'allMedalLeagues';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
      defaultValue: [],
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
