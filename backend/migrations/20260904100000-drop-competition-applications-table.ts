import type { QueryInterface } from 'sequelize';

// The competition-applications feature (module, service, controller, model)
// was removed before shipping. Its creating migrations were deleted from
// the repo, but the table survived on already-migrated databases. This
// migration removes the divergence:
//   - drops the `competition_applications` table (and its status enum)
//   - removes the orphan SequelizeMeta rows so `migrate:undo` stays in
//     step with the files on disk
const TABLE = 'competition_applications';
const DELETED_MIGRATIONS = [
  '20260901090500-create-competition-applications.ts',
  '20260901170100-make-competition-applications-coach-id-nullable.ts',
];

async function tableExists(
  queryInterface: QueryInterface,
  tableName: string,
): Promise<boolean> {
  const [rows] = await queryInterface.sequelize.query(
    'SELECT to_regclass(:tableName) AS reg',
    { replacements: { tableName } },
  );
  return (rows[0] as { reg: string | null }).reg !== null;
}

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    if (await tableExists(queryInterface, TABLE)) {
      await queryInterface.dropTable(TABLE, { cascade: true });
    }
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_competition_applications_status"',
    );

    await queryInterface.sequelize.query(
      'DELETE FROM "SequelizeMeta" WHERE name IN (:names)',
      { replacements: { names: DELETED_MIGRATIONS } },
    );
  },

  down: async () => {
    // Recreating the table is intentionally omitted: the model, service and
    // controller that used it were deleted along with it, so there is
    // nothing left in the codebase to restore its usage to.
  },
};
