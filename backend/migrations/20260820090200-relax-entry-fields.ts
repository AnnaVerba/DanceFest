import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';

// Форма заявки учасника (публічна) не збирає вікову категорію/лігу/програму
// окремо — вони приходили лише з фіксованого мокапу. Категорії конкурсу тепер
// довільні осі (див. nominations), тож ці три поля стають необов'язковими.
// studioName і choreographer теж не позначені обов'язковими в самій формі.
const NULLABLE_COLUMNS = ['ageCategory', 'league', 'program', 'studioName', 'choreographer'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);

    for (const column of NULLABLE_COLUMNS) {
      await queryInterface.changeColumn(TABLE, column, {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }

    if (!table.city) {
      await queryInterface.addColumn(TABLE, 'city', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
    if (!table.improv) {
      await queryInterface.addColumn(TABLE, 'improv', {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }
    if (!table.paymentMethod) {
      await queryInterface.addColumn(TABLE, 'paymentMethod', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table.paymentMethod) {
      await queryInterface.removeColumn(TABLE, 'paymentMethod');
    }
    if (table.improv) {
      await queryInterface.removeColumn(TABLE, 'improv');
    }
    if (table.city) {
      await queryInterface.removeColumn(TABLE, 'city');
    }
    for (const column of NULLABLE_COLUMNS) {
      await queryInterface.changeColumn(TABLE, column, {
        type: DataTypes.STRING,
        allowNull: false,
      });
    }
  },
};
