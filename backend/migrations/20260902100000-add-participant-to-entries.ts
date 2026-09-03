import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const COLUMN = 'participantId';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'participants', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      });
      await queryInterface.addIndex(TABLE, [COLUMN]);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
  },
};
