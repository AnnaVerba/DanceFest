import type { QueryInterface } from 'sequelize';

const TABLE = 'competitions';
const CONSTRAINT = 'competitions_ownerId_fkey';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // ownerId can now point at either an admin or an organizer, so it can
    // no longer be constrained to a single table via a DB-level foreign key.
    await queryInterface.removeConstraint(TABLE, CONSTRAINT);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.addConstraint(TABLE, {
      type: 'foreign key',
      fields: ['ownerId'],
      name: CONSTRAINT,
      references: { table: 'admins', field: 'id' },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE',
    });
  },
};
