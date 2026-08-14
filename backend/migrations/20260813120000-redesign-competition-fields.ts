import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'competitions';

async function ensureColumn(
  queryInterface: QueryInterface,
  name: string,
  options: Parameters<QueryInterface['addColumn']>[2],
): Promise<void> {
  const table = await queryInterface.describeTable(TABLE);
  if (!table[name]) {
    await queryInterface.addColumn(TABLE, name, options);
  }
}

async function ensureColumnRemoved(
  queryInterface: QueryInterface,
  name: string,
): Promise<void> {
  const table = await queryInterface.describeTable(TABLE);
  if (table[name]) {
    await queryInterface.removeColumn(TABLE, name);
  }
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await ensureColumnRemoved(queryInterface, 'date');
    await ensureColumnRemoved(queryInterface, 'location');
    await ensureColumnRemoved(queryInterface, 'style');

    await ensureColumn(queryInterface, 'image', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'description', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'dateFrom', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'dateTo', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'registrationFrom', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'registrationTo', {
      type: DataTypes.DATEONLY,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'contactNumber', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await ensureColumn(queryInterface, 'contactEmail', {
      type: DataTypes.STRING,
      allowNull: true,
    });

    await queryInterface.sequelize.query(`
      UPDATE ${TABLE} SET
        description = COALESCE(description, ''),
        "dateFrom" = COALESCE("dateFrom", CURRENT_DATE),
        "dateTo" = COALESCE("dateTo", CURRENT_DATE),
        "registrationFrom" = COALESCE("registrationFrom", CURRENT_DATE),
        "registrationTo" = COALESCE("registrationTo", CURRENT_DATE),
        "contactNumber" = COALESCE("contactNumber", ''),
        "contactEmail" = COALESCE("contactEmail", '')
    `);

    await queryInterface.changeColumn(TABLE, 'description', {
      type: DataTypes.TEXT,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'dateFrom', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'dateTo', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'registrationFrom', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'registrationTo', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'contactNumber', {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn(TABLE, 'contactEmail', {
      type: DataTypes.STRING,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await ensureColumnRemoved(queryInterface, 'image');
    await ensureColumnRemoved(queryInterface, 'description');
    await ensureColumnRemoved(queryInterface, 'dateFrom');
    await ensureColumnRemoved(queryInterface, 'dateTo');
    await ensureColumnRemoved(queryInterface, 'registrationFrom');
    await ensureColumnRemoved(queryInterface, 'registrationTo');
    await ensureColumnRemoved(queryInterface, 'contactNumber');
    await ensureColumnRemoved(queryInterface, 'contactEmail');

    await ensureColumn(queryInterface, 'date', {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
    await ensureColumn(queryInterface, 'location', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
    await ensureColumn(queryInterface, 'style', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
  },
};
