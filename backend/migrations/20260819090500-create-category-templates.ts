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
      authorId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'admins', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
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
      // [{ name: string, values: string[] }, ...]
      axes: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: [],
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
