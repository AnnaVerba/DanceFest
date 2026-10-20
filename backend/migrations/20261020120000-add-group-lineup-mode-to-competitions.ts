import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';
const COLUMN = 'groupLineupMode';
// 'count' — a group gives only its headcount; 'named' — every dancer is named.
const DEFAULT_MODE = 'count';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: DEFAULT_MODE,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
  },
};
