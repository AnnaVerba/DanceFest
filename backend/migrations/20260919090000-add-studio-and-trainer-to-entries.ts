import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const STUDIO_COLUMN = 'studioId';
const TRAINER_COLUMN = 'trainerId';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[STUDIO_COLUMN]) {
      await queryInterface.addColumn(TABLE, STUDIO_COLUMN, {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onDelete: 'SET NULL',
      });
    }
    if (!table[TRAINER_COLUMN]) {
      await queryInterface.addColumn(TABLE, TRAINER_COLUMN, {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex(TABLE, [TRAINER_COLUMN]);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[TRAINER_COLUMN]) {
      await queryInterface.removeColumn(TABLE, TRAINER_COLUMN);
    }
    if (table[STUDIO_COLUMN]) {
      await queryInterface.removeColumn(TABLE, STUDIO_COLUMN);
    }
  },
};
