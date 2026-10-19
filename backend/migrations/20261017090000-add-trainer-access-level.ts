import type { QueryInterface } from 'sequelize';

const ENUM_TYPE = 'enum_users_accessLevel';
const TRAINER_LEVEL = 'TRAINER';

// A trainer works in a studio under its head (COACH): they see their own
// dancers, the head sees them too.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${ENUM_TYPE}" ADD VALUE IF NOT EXISTS '${TRAINER_LEVEL}'`,
    );
  },

  down: async () => {
    // Postgres has no ALTER TYPE ... DROP VALUE; the extra enum member stays.
  },
};
