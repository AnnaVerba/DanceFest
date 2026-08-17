import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('competitions', 'ownerId', {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'admins', key: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('competitions', 'ownerId');
  },
};
