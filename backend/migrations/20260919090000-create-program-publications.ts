import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'program_publications';
const ENUM_TYPE = 'enum_program_publications_status';
const PROGRAM_STATUSES = ['draft', 'published'];
const DEFAULT_PROGRAM_STATUS = 'draft';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
      competitionId: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        references: { model: 'competitions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM(...PROGRAM_STATUSES),
        allowNull: false,
        defaultValue: DEFAULT_PROGRAM_STATUS,
      },
      publishedAt: { type: DataTypes.DATE, allowNull: true },
      snapshot: { type: DataTypes.JSONB, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_TYPE}";`);
  },
};
