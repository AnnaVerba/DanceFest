import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';

module.exports = {
  // Ідемпотентно (через describeTable), як і попередня міграція схеми —
  // безпечно перезапустити, якщо колонка вже додана вручну.
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table.location) {
      await queryInterface.addColumn(TABLE, 'location', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE ${TABLE} SET location = COALESCE(location, '')
    `);

    await queryInterface.changeColumn(TABLE, 'location', {
      type: DataTypes.STRING,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table.location) {
      await queryInterface.removeColumn(TABLE, 'location');
    }
  },
};
