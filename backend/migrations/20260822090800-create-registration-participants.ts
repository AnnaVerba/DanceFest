import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'registration_participants';

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
      personId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'persons', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
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
      fields: ['registrationId', 'personId'],
      name: 'registration_participants_registration_id_person_id_unique',
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
  },
};
