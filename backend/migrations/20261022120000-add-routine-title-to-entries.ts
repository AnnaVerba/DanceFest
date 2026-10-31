import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const ROUTINE_TITLE_COLUMN = 'routineTitle';

// The optional title of a solo, duo or trio number, shown in the program
// after the dancers' names; routineName keeps the names themselves.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[ROUTINE_TITLE_COLUMN]) {
      await queryInterface.addColumn(TABLE, ROUTINE_TITLE_COLUMN, {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[ROUTINE_TITLE_COLUMN]) {
      await queryInterface.removeColumn(TABLE, ROUTINE_TITLE_COLUMN);
    }
  },
};
