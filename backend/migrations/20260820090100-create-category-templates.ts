import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('category_templates', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      isPublic: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      axes: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      authorId: {
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

    await queryInterface.addIndex('category_templates', {
      fields: ['authorId'],
      name: 'category_templates_author_id_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('category_templates');
  },
};
