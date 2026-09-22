import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'entries';
const COLUMN = 'groupNumber';
const GROUP_LINEUPS = ['Дуо', 'Тріо', 'Група'];

// Кожен груповий виступ отримує власний номер зі спільної з учасниками
// послідовності: наявні заявки нумеруються за порядком номера заявки,
// починаючи одразу після найбільшого номера учасника конкурсу.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.INTEGER,
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      `UPDATE entries e
          SET "groupNumber" = (
                SELECT COALESCE(MAX(p.number), 0)
                  FROM competition_participant_numbers p
                 WHERE p."competitionId" = e."competitionId"
              ) + ranked.position
         FROM (
                SELECT id,
                       ROW_NUMBER() OVER (
                         PARTITION BY "competitionId" ORDER BY number
                       ) AS position
                  FROM entries
                 WHERE lineup IN (:lineups)
              ) ranked
        WHERE ranked.id = e.id`,
      { replacements: { lineups: GROUP_LINEUPS } },
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn(TABLE, COLUMN);
  },
};
