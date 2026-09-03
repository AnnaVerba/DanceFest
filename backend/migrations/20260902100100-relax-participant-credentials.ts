import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'participants';
// Sequelize names a column-level unique constraint `<table>_<column>_key`
// on Postgres.
const EMAIL_UNIQUE_CONSTRAINT = 'participants_email_key';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // A coach can add a roster participant with only a name, phone and
    // birth date; email and password are set later when the participant
    // claims the account.
    await queryInterface.removeConstraint(
      TABLE,
      EMAIL_UNIQUE_CONSTRAINT,
    ).catch(() => undefined);

    await queryInterface.changeColumn(TABLE, 'email', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn(TABLE, 'passwordHash', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn(TABLE, 'passwordHash', {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'email', {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.addConstraint(TABLE, {
      type: 'unique',
      fields: ['email'],
      name: EMAIL_UNIQUE_CONSTRAINT,
    });
  },
};
