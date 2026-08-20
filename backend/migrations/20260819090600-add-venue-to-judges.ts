import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'judges';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table.venueId) {
      await queryInterface.addColumn(TABLE, 'venueId', {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'venues', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table.venueId) {
      await queryInterface.removeColumn(TABLE, 'venueId');
    }
  },
};
