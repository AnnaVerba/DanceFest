import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// `confirmed = false` marks a stub row with no real login behind it yet:
// a coach-created roster participant, or a named-but-unregistered mentor
// coach. It flips to true on claim-complete or on registration by phone.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('users');
    if (!table.confirmed) {
      await queryInterface.addColumn('users', 'confirmed', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      });
    }
    await queryInterface.sequelize.query(
      'UPDATE users SET confirmed = false WHERE "passwordHash" IS NULL',
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('users', 'confirmed');
  },
};
