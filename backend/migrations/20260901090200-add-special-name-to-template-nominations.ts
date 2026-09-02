import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// У спецкатегорії зберігалась лише повна мітка — «Корона Шехеризади · Юніори 1
// · Дебют». Голе ім'я з неї діставалось би розбором по роздільнику, і зламалось
// би на першій назві, у якій той роздільник трапляється всередині.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('template_nominations', 'specialName', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('template_nominations', 'specialName');
  },
};
