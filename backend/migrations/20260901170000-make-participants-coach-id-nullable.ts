import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'participants';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // A participant can now self-register without picking a coach.
    // NOTE: deliberately omits `references` — passing it here makes
    // Sequelize's Postgres changeColumn emit only an `ADD FOREIGN KEY`
    // (a harmless duplicate of the existing one) and silently drop the
    // allowNull change. The FK from the original createTable is untouched.
    await queryInterface.changeColumn(TABLE, 'coachId', {
      type: DataTypes.UUID,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn(TABLE, 'coachId', {
      type: DataTypes.UUID,
      allowNull: false,
    });
  },
};
