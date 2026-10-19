import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const INSTRUCTOR_ID_COLUMN = 'instructorId';
const INSTRUCTOR_NAME_COLUMN = 'instructorName';

// The trainer (тренер) of the dancers, next to the studio head already kept
// in trainerId / choreographer.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[INSTRUCTOR_ID_COLUMN]) {
      await queryInterface.addColumn(TABLE, INSTRUCTOR_ID_COLUMN, {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
      });
      await queryInterface.addIndex(TABLE, [INSTRUCTOR_ID_COLUMN]);
    }
    if (!table[INSTRUCTOR_NAME_COLUMN]) {
      await queryInterface.addColumn(TABLE, INSTRUCTOR_NAME_COLUMN, {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[INSTRUCTOR_NAME_COLUMN]) {
      await queryInterface.removeColumn(TABLE, INSTRUCTOR_NAME_COLUMN);
    }
    if (table[INSTRUCTOR_ID_COLUMN]) {
      await queryInterface.removeColumn(TABLE, INSTRUCTOR_ID_COLUMN);
    }
  },
};
