import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// The schedule now counts an exit by its track and freezes the part of a
// too-long track it left out next to durationSeconds. Rows built before
// this start at 0 until the next recalculation.
const TABLE = 'section_items';
const COLUMN = 'overageSeconds';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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
