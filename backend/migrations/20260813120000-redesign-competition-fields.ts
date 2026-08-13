import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('competitions', 'date');
    await queryInterface.removeColumn('competitions', 'location');
    await queryInterface.removeColumn('competitions', 'style');

    await queryInterface.addColumn('competitions', 'image', {
      type: DataTypes.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn('competitions', 'description', {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('competitions', 'dateFrom', {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
    await queryInterface.addColumn('competitions', 'dateTo', {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
    await queryInterface.addColumn('competitions', 'registrationFrom', {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
    await queryInterface.addColumn('competitions', 'registrationTo', {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
    await queryInterface.addColumn('competitions', 'contactNumber', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('competitions', 'contactEmail', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });

    // Тимчасові значення за замовчуванням прибираємо — далі поля обов'язкові без дефолту.
    await queryInterface.changeColumn('competitions', 'description', {
      type: DataTypes.TEXT,
      allowNull: false,
    });
    await queryInterface.changeColumn('competitions', 'dateFrom', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('competitions', 'dateTo', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('competitions', 'registrationFrom', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('competitions', 'registrationTo', {
      type: DataTypes.DATEONLY,
      allowNull: false,
    });
    await queryInterface.changeColumn('competitions', 'contactNumber', {
      type: DataTypes.STRING,
      allowNull: false,
    });
    await queryInterface.changeColumn('competitions', 'contactEmail', {
      type: DataTypes.STRING,
      allowNull: false,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('competitions', 'image');
    await queryInterface.removeColumn('competitions', 'description');
    await queryInterface.removeColumn('competitions', 'dateFrom');
    await queryInterface.removeColumn('competitions', 'dateTo');
    await queryInterface.removeColumn('competitions', 'registrationFrom');
    await queryInterface.removeColumn('competitions', 'registrationTo');
    await queryInterface.removeColumn('competitions', 'contactNumber');
    await queryInterface.removeColumn('competitions', 'contactEmail');

    await queryInterface.addColumn('competitions', 'date', {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    });
    await queryInterface.addColumn('competitions', 'location', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('competitions', 'style', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
  },
};
