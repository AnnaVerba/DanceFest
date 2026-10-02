import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// timeSource was never read: the schedule now always counts an exit by its
// track (see performanceDuration), so the switch goes away with its enum.
const TABLE = 'competition_rules';
const COLUMN = 'timeSource';
const ENUM_TYPE = 'enum_competition_rules_timeSource';
const TIME_SOURCES = ['track', 'limit'];
const DEFAULT_TIME_SOURCE = 'limit';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_TYPE}"`);
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (!table[COLUMN]) {
      await queryInterface.addColumn(TABLE, COLUMN, {
        type: DataTypes.ENUM(...TIME_SOURCES),
        allowNull: false,
        defaultValue: DEFAULT_TIME_SOURCE,
      });
    }
  },
};
