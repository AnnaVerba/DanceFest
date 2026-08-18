import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Дозвіл від адміна. Не плутати з entries.improv — там позначка учасника,
    // що його виступ саме імпровізація.
    await queryInterface.addColumn('nominations', 'allowsImprovisation', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('nominations', 'categoryIds', {
      type: DataTypes.ARRAY(DataTypes.UUID),
      allowNull: false,
      defaultValue: [],
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('nominations', 'categoryIds');
    await queryInterface.removeColumn('nominations', 'allowsImprovisation');
  },
};
