import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';
// Дані вже перенесені в payment_details попередньою міграцією
// (20260821090000-create-payment-details).
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
      if (table[column]) {
        await queryInterface.removeColumn(TABLE, column);
      }
    }
  },

  down: async (queryInterface: QueryInterface) => {
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
};
