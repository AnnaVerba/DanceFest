import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const PURCHASED_SECONDS_COLUMN = 'purchasedExtraSeconds';
const EXTRA_FEE_COLUMN = 'extraFee';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[PURCHASED_SECONDS_COLUMN]) {
      await queryInterface.addColumn(TABLE, PURCHASED_SECONDS_COLUMN, {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      });
    }
    if (!table[EXTRA_FEE_COLUMN]) {
      await queryInterface.addColumn(TABLE, EXTRA_FEE_COLUMN, {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[EXTRA_FEE_COLUMN]) {
      await queryInterface.removeColumn(TABLE, EXTRA_FEE_COLUMN);
    }
    if (table[PURCHASED_SECONDS_COLUMN]) {
      await queryInterface.removeColumn(TABLE, PURCHASED_SECONDS_COLUMN);
    }
  },
};
