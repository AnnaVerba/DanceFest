import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competition_participant_numbers';

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
      // Особа = рядок у `users` (окремої таблиці persons немає).
      personId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      number: {
        type: DataTypes.INTEGER,
        allowNull: false,
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

    await queryInterface.addIndex(TABLE, ['competitionId', 'personId'], {
      unique: true,
      name: 'competition_participant_numbers_competition_person_unique',
    });
    await queryInterface.addIndex(TABLE, ['competitionId', 'number'], {
      unique: true,
      name: 'competition_participant_numbers_competition_number_unique',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
  },
};
