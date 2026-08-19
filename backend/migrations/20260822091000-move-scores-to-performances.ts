import type { QueryInterface } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('scores', 'scores_entry_id_judge_id_idx');
    await queryInterface.sequelize.query(
      'ALTER TABLE scores DROP CONSTRAINT "scores_entryId_fkey"',
    );
    await queryInterface.renameColumn('scores', 'entryId', 'performanceId');
    await queryInterface.sequelize.query(
      `ALTER TABLE scores
         ADD CONSTRAINT "scores_performanceId_fkey"
         FOREIGN KEY ("performanceId") REFERENCES performances(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryInterface.addIndex('scores', {
      fields: ['performanceId', 'judgeId'],
      name: 'scores_performance_id_judge_id_idx',
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(
      'scores',
      'scores_performance_id_judge_id_idx',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE scores DROP CONSTRAINT "scores_performanceId_fkey"',
    );
    await queryInterface.renameColumn('scores', 'performanceId', 'entryId');
    await queryInterface.sequelize.query(
      `ALTER TABLE scores
         ADD CONSTRAINT "scores_entryId_fkey"
         FOREIGN KEY ("entryId") REFERENCES entries(id)
         ON DELETE CASCADE ON UPDATE CASCADE`,
    );
    await queryInterface.addIndex('scores', {
      fields: ['entryId', 'judgeId'],
      name: 'scores_entry_id_judge_id_idx',
      unique: true,
    });
  },
};
