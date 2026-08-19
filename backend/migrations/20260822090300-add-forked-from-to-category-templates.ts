import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('category_templates', 'forkedFromId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'category_templates', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('category_templates', 'forkedFromId');
  },
};
