import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// Payment details are optional — an organizer may leave the beneficiary
// and account blank.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn('payment_details', 'beneficiary', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.changeColumn('payment_details', 'account', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.changeColumn('payment_details', 'beneficiary', {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('payment_details', 'account', {
      type: DataTypes.STRING,
      allowNull: false,
    });
  },
};
