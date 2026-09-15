import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'award_settings';
const ENUM_TYPE = 'enum_award_settings_awardSystem';
const AWARD_SYSTEMS = ['standard', 'medal_standings'];
const DEFAULT_AWARD_SYSTEM = 'standard';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false },
      competitionId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'competitions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      awardSystem: {
        type: DataTypes.ENUM(...AWARD_SYSTEMS),
        allowNull: false,
        defaultValue: DEFAULT_AWARD_SYSTEM,
      },
      overrides: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_TYPE}";`);
  },
};
