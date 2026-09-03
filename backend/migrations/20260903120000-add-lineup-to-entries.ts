import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// The number's line-up (Соло / Дуо / Тріо / Група) is derived from the
// dancer count, alongside league and age category. Backfill existing rows
// from participantsCount.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable('entries');
    if (!table.lineup) {
      await queryInterface.addColumn('entries', 'lineup', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
    await queryInterface.sequelize.query(`
      UPDATE entries SET lineup = CASE
        WHEN COALESCE("participantsCount", 1) >= 4 THEN 'Група'
        WHEN "participantsCount" = 3 THEN 'Тріо'
        WHEN "participantsCount" = 2 THEN 'Дуо'
        ELSE 'Соло'
      END
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('entries', 'lineup');
  },
};
