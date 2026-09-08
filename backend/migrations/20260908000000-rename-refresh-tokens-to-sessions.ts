import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const OLD_TABLE = 'refresh_tokens';
const NEW_TABLE = 'sessions';
const OLD_USER_INDEX = 'refresh_tokens_user_id_idx';
const NEW_USER_INDEX = 'sessions_user_id_idx';
const USER_FK = 'sessions_user_id_fkey';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Rows whose user is already gone would fail the new foreign key.
    await queryInterface.sequelize.query(
      `DELETE FROM "${OLD_TABLE}" WHERE "userId" NOT IN (SELECT "id" FROM "users")`,
    );

    await queryInterface.renameTable(OLD_TABLE, NEW_TABLE);
    await queryInterface.sequelize.query(
      `ALTER INDEX "${OLD_USER_INDEX}" RENAME TO "${NEW_USER_INDEX}"`,
    );

    await queryInterface.addColumn(NEW_TABLE, 'fingerprint', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn(NEW_TABLE, 'ipAddress', {
      type: DataTypes.STRING(45),
      allowNull: true,
    });
    await queryInterface.addColumn(NEW_TABLE, 'userAgent', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await queryInterface.addColumn(NEW_TABLE, 'lastUsedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });

    await queryInterface.addConstraint(NEW_TABLE, {
      fields: ['userId'],
      type: 'foreign key',
      name: USER_FK,
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeConstraint(NEW_TABLE, USER_FK);
    await queryInterface.removeColumn(NEW_TABLE, 'lastUsedAt');
    await queryInterface.removeColumn(NEW_TABLE, 'userAgent');
    await queryInterface.removeColumn(NEW_TABLE, 'ipAddress');
    await queryInterface.removeColumn(NEW_TABLE, 'fingerprint');
    await queryInterface.sequelize.query(
      `ALTER INDEX "${NEW_USER_INDEX}" RENAME TO "${OLD_USER_INDEX}"`,
    );
    await queryInterface.renameTable(NEW_TABLE, OLD_TABLE);
  },
};
