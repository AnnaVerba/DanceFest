import type { QueryInterface } from 'sequelize';

// An entry moved to another nomination used to keep its old schedule group
// key, so its exit ran as a block of its own under the new nomination's name
// (ScheduleService.followNominationChange now moves it). Rows left behind
// get the key their entry has today (ScheduleService.nominationGroupKeyOf);
// their place in the running order stays as it is.
const SEPARATOR = '::';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE section_items si
          SET "nominationGroupKey" = k.key
         FROM (SELECT e.id,
                      COALESCE(e."nominationId"::text, e.nomination)
                        || CASE WHEN e.program IS NOT NULL AND e.program <> ''
                                THEN :separator || e.program ELSE '' END AS key
                 FROM entries e) k
        WHERE k.id = si."entryId"
          AND si.type = 'performance'
          AND si."nominationGroupKey" IS DISTINCT FROM k.key`,
      { replacements: { separator: SEPARATOR } },
    );
  },

  // The stale keys are not worth restoring.
  down: async () => {},
};
