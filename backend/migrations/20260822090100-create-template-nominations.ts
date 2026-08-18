import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('template_nominations', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      templateId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'category_templates', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
      },
      allowsImprovisation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      // Масив, а не join-таблиця: комбінацій бувають тисячі, а посилання
      // потрібне лише для дозгенерації та фільтрів.
      categoryIds: {
        type: DataTypes.ARRAY(DataTypes.UUID),
        allowNull: false,
        defaultValue: [],
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
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

    await queryInterface.addIndex('template_nominations', {
      fields: ['templateId'],
      name: 'template_nominations_template_id_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('template_nominations');
  },
};
