import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';

// organizer (single free-text string) becomes organizers (a free-text
// array) so a competition can list several organizers.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table.organizers) {
      await queryInterface.addColumn(TABLE, 'organizers', {
        type: DataTypes.ARRAY(DataTypes.STRING),
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE ${TABLE} SET organizers = ARRAY[organizer] WHERE organizers IS NULL
    `);

    await queryInterface.changeColumn(TABLE, 'organizers', {
      type: DataTypes.ARRAY(DataTypes.STRING),
      allowNull: false,
    });

    if (table.organizer) {
      await queryInterface.removeColumn(TABLE, 'organizer');
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table.organizer) {
      await queryInterface.addColumn(TABLE, 'organizer', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE ${TABLE} SET organizer = organizers[1] WHERE organizer IS NULL
    `);

    await queryInterface.changeColumn(TABLE, 'organizer', {
      type: DataTypes.STRING,
      allowNull: false,
    });

    if (table.organizers) {
      await queryInterface.removeColumn(TABLE, 'organizers');
    }
  },
};
