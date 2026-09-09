import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'section_items';
const ENUM_TYPE = 'enum_section_items_type';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${ENUM_TYPE}" ADD VALUE IF NOT EXISTS 'break'`,
    );
    await queryInterface.sequelize.query(
      `ALTER TYPE "${ENUM_TYPE}" ADD VALUE IF NOT EXISTS 'gala'`,
    );
    await queryInterface.addColumn(TABLE, 'label', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, 'label');
    // Postgres has no ALTER TYPE ... DROP VALUE; the extra enum members stay.
  },
};
