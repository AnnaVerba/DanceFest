import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// `leagues` was superseded by `categories` (type = 'level'): a league is a
// category on the 'level' axis, there is no separate entity. Its creating
// migration file was deleted from the repo, but the table and a stale
// competition_applications.leagueId -> leagues foreign key survived on
// already-migrated databases (a freshly migrated DB points leagueId at
// `categories`). This migration removes the divergence:
//   - repoints the FK at `categories` (matching the model and source)
//   - drops the `leagues` table
//   - removes the orphan SequelizeMeta row so `migrate:undo` stays in
//     step with the files on disk
//
// competition_applications itself was later removed too (its creating
// migration is gone from the repo), so a freshly migrated database never
// has it here — the repoint is skipped in that case.
const FK = 'competition_applications_leagueId_fkey';
const DELETED_MIGRATION = '20260901090400-create-leagues.ts';

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
    if (await tableExists(queryInterface, 'competition_applications')) {
      await queryInterface
        .removeConstraint('competition_applications', FK)
        .catch(() => undefined);
      await queryInterface.addConstraint('competition_applications', {
        type: 'foreign key',
        fields: ['leagueId'],
        references: { table: 'categories', field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        name: FK,
      });
    }

    await queryInterface.dropTable('leagues', { cascade: true });

    await queryInterface.sequelize.query(
      'DELETE FROM "SequelizeMeta" WHERE name = :name',
      { replacements: { name: DELETED_MIGRATION } },
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('leagues', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    if (await tableExists(queryInterface, 'competition_applications')) {
      await queryInterface
        .removeConstraint('competition_applications', FK)
        .catch(() => undefined);
      await queryInterface.addConstraint('competition_applications', {
        type: 'foreign key',
        fields: ['leagueId'],
        references: { table: 'leagues', field: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
        name: FK,
      });
    }
  },
};
