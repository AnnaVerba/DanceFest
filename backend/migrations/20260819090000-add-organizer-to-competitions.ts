import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table.organizer) {
      await queryInterface.addColumn(TABLE, 'organizer', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE ${TABLE} SET organizer = COALESCE(organizer, '')
    `);

    await queryInterface.changeColumn(TABLE, 'organizer', {
      type: DataTypes.STRING,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table.organizer) {
      await queryInterface.removeColumn(TABLE, 'organizer');
    }
  },
};
