import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const COLUMN = 'submittedByUserId';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.UUID,
        allowNull: true,
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
