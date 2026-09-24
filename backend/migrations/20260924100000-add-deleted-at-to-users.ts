import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'users';
const COLUMN = 'deletedAt';

// Soft delete: a deleted user keeps every row that points at them, but their
// phone and email are renamed (see UsersService.softDelete) so the same
// contacts can register again as a new account.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
