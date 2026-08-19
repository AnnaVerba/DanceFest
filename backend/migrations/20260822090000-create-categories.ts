import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('categories', {
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
      type: {
        type: DataTypes.ENUM(
          'age',
          'level',
          'direction',
          'discipline',
          'participants_count',
        ),
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

    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX categories_type_normalized_name_unique
         ON categories ("type", lower(btrim(name)))`,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('categories');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_categories_type"',
    );
  },
};
