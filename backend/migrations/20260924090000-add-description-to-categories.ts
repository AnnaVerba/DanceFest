import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'categories';
const COLUMN = 'description';

// Пояснення до значення довідника («Дорослі — 18 років і старші»), яке
// бачить учасник у формі заявки. Спільне для всіх конкурсів, задає адмін.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
