import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';
const COLUMNS = [
  'paymentRecipient',
  'paymentAccount',
  'paymentBank',
  'paymentTaxId',
  'paymentPurpose',
] as const;

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    for (const column of COLUMNS) {
      if (!table[column]) {
        await queryInterface.addColumn(TABLE, column, {
          type: DataTypes.STRING,
          allowNull: true,
        });
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    for (const column of COLUMNS) {
      if (table[column]) {
        await queryInterface.removeColumn(TABLE, column);
      }
    }
  },
};
