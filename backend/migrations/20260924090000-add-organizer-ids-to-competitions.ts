import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';
const COLUMN = 'organizerIds';

// Id облікового запису для кожного імені зі списку `organizers` (за тим самим
// індексом); записи без облікового запису — нульовий UUID. Наявні конкурси
// не мають облікових записів співорганізаторів, тож їх ніхто не чіпає.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
