import type { QueryInterface } from 'sequelize';

const ENUM_TYPE = 'enum_export_jobs_status';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `ALTER TYPE "${ENUM_TYPE}" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
  },

  down: async () => {
    // Postgres has no ALTER TYPE ... DROP VALUE; the extra enum member stays.
  },
};
