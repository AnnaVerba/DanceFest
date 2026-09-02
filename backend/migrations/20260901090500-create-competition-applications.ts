import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competition_applications';

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
      participantId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'participants', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      coachId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'coaches', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      // Ліга — це категорія осі 'level' (categories.type), окремої таблиці
      // для ліг немає.
      leagueId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
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

    await queryInterface.addIndex(TABLE, ['competitionId']);
    await queryInterface.addIndex(TABLE, ['participantId']);
    await queryInterface.addIndex(TABLE, ['coachId']);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_competition_applications_status"',
    );
  },
};
