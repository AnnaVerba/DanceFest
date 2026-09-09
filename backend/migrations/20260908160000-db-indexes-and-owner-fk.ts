import type { QueryInterface } from 'sequelize';

// Performance / integrity pass:
//  - competitions.ownerId was left without a FK when `admins` was folded
//    into `users`; re-add it (RESTRICT — a competition always has an owner).
//  - index the referencing side of FK columns that have no covering index,
//    so a parent DELETE/UPDATE doesn't seq-scan (and lock) the child.
//  - a GIN index for the entries.participantIds overlap query behind the
//    "my entries" cabinet.

const OWNER_FK = 'competitions_ownerId_fkey';

interface IndexSpec {
  table: string;
  name: string;
  sql: string;
}

const INDEXES: IndexSpec[] = [
  {
    table: 'competitions',
    name: 'competitions_owner_id_idx',
    sql: 'CREATE INDEX competitions_owner_id_idx ON competitions ("ownerId")',
  },
  {
    table: 'entries',
    name: 'entries_participant_ids_gin_idx',
    sql: 'CREATE INDEX entries_participant_ids_gin_idx ON entries USING gin ("participantIds")',
  },
  {
    table: 'users',
    name: 'users_coach_id_last_name_idx',
    sql: 'CREATE INDEX users_coach_id_last_name_idx ON users ("coachId", "lastName")',
  },
  {
    table: 'users',
    name: 'users_school_id_idx',
    sql: 'CREATE INDEX users_school_id_idx ON users ("schoolId")',
  },
  {
    table: 'competition_admins',
    name: 'competition_admins_admin_id_idx',
    sql: 'CREATE INDEX competition_admins_admin_id_idx ON competition_admins ("adminId")',
  },
  {
    table: 'judges',
    name: 'judges_competition_id_idx',
    sql: 'CREATE INDEX judges_competition_id_idx ON judges ("competitionId")',
  },
  {
    table: 'competition_participant_numbers',
    name: 'competition_participant_numbers_person_id_idx',
    sql: 'CREATE INDEX competition_participant_numbers_person_id_idx ON competition_participant_numbers ("personId")',
  },
  {
    table: 'scores',
    name: 'scores_judge_id_idx',
    sql: 'CREATE INDEX scores_judge_id_idx ON scores ("judgeId")',
  },
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Fail loudly rather than silently drop competitions with a dangling owner.
    await queryInterface.sequelize.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM competitions c
          LEFT JOIN users u ON u.id = c."ownerId"
          WHERE u.id IS NULL
        ) THEN
          RAISE EXCEPTION 'competitions with a missing ownerId exist — fix before adding the FK';
        END IF;
      END $$;
    `);

    await queryInterface.addConstraint('competitions', {
      fields: ['ownerId'],
      type: 'foreign key',
      name: OWNER_FK,
      references: { table: 'users', field: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT',
    });

    for (const idx of INDEXES) {
      await queryInterface.sequelize.query(idx.sql);
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const idx of [...INDEXES].reverse()) {
      await queryInterface.removeIndex(idx.table, idx.name);
    }
    await queryInterface.removeConstraint('competitions', OWNER_FK);
  },
};
