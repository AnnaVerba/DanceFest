import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('entries', {
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
      number: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      routineName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nomination: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ageCategory: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      league: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      program: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      participantsCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      studioName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      choreographer: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      score: {
        type: DataTypes.DECIMAL(4, 1),
        allowNull: true,
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

    await queryInterface.addIndex('entries', {
      fields: ['competitionId'],
      name: 'entries_competition_id_idx',
    });
    await queryInterface.addIndex('entries', {
      fields: ['competitionId', 'number'],
      name: 'entries_competition_id_number_idx',
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('entries');
  },
};
