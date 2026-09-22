import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Ціна номінації задається не на рядку, а на значенні осі — «Дуо», «Дебют».
// Тримати її в самій категорії не можна: `categories` — спільний довідник без
// власника, і ціна на рядку «Дуо» стала б ціною дуету в усіх організаторів
// одразу. Тому ціна живе на перетині шаблон × категорія.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('template_category_prices', {
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
      categoryId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
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

    // Одна ціна на значення осі в межах шаблону: два рядки на «Дуо»
    // означали б, що ціна дуету залежить від того, який із них прочитали.
    await queryInterface.addConstraint('template_category_prices', {
      fields: ['templateId', 'categoryId'],
      type: 'unique',
      name: 'template_category_prices_template_category_unique',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('template_category_prices');
  },
};
