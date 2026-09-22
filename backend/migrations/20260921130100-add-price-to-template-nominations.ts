import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'template_nominations';
const COLUMN = 'price';

// Точна ціна номінації шаблону — те, що організатор вписав у рядок, і те, що
// поїде в конкурс при імпорті. Ціни в template_category_prices лише допомагають
// заповнити її при генерації й на збережені номінації заднім числом не діють.
//
// Колонку з такою ж назвою знімала міграція 20260901090000 як копію конкурсної
// ціни. Копією вона більше не є: конкурс, створений колись за цим шаблоном, має
// власні nominations.price і правка шаблону їх не торкається.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
