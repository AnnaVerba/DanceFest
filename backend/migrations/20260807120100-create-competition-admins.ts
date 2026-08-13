import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('competition_admins', {
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
      adminId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'admins', key: 'id' },
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

    await queryInterface.addIndex('competition_admins', {
      fields: ['competitionId', 'adminId'],
      unique: true,
      name: 'competition_admins_competition_id_admin_id_unique',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('competition_admins');
  },
};
