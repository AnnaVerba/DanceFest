import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'registrations';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      competitionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'competitions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      nominationId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'nominations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      routineName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      coachId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'persons', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      submittedByPersonId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'persons', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      choreographer: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      studioName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      improv: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      status: {
        type: DataTypes.ENUM('draft', 'submitted', 'confirmed', 'cancelled'),
        allowNull: false,
        defaultValue: 'submitted',
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
      name: 'registrations_competition_id_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_registrations_status"',
    );
  },
};
