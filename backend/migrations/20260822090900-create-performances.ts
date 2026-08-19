import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'performances';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      registrationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'registrations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      competitionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'competitions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      programName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      round: {
        type: DataTypes.ENUM('final', 'semifinal'),
        allowNull: false,
        defaultValue: 'final',
      },
      status: {
        type: DataTypes.ENUM('scheduled', 'absent', 'withdrawn'),
        allowNull: false,
        defaultValue: 'scheduled',
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex(TABLE, {
      fields: ['competitionId'],
      name: 'performances_competition_id_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_performances_round"',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_performances_status"',
    );
  },
};
