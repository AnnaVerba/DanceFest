import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'users';
const COLUMN = 'studioRole';
const ENUM_TYPE = 'enum_users_studioRole';
const HEAD = 'HEAD';
const TRAINER = 'TRAINER';

// Head or trainer of the user's studio, kept apart from accessLevel so it
// survives an upgrade to ORGANIZER. Backfill: every coach or organizer with
// a school heads it (organizers are upgraded coaches). No trainer exists
// yet — the TRAINER level is added in the same release.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) return;
    await queryInterface.addColumn(TABLE, COLUMN, {
      type: DataTypes.ENUM(HEAD, TRAINER),
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      `UPDATE "${TABLE}" SET "${COLUMN}" = '${HEAD}'
       WHERE "schoolId" IS NOT NULL
         AND "accessLevel" IN ('COACH', 'ORGANIZER')`,
    );
  },

  down: async (queryInterface: QueryInterface) => {
    const table = await queryInterface.describeTable(TABLE);
    if (table[COLUMN]) {
      await queryInterface.removeColumn(TABLE, COLUMN);
    }
    await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${ENUM_TYPE}"`);
  },
};
