import type { QueryInterface } from 'sequelize';

// A per-program exit's schedule group key now carries its program
// (ScheduleService.nominationGroupKeyOf), so each style of the nomination is
// its own block under its own header. Rows built before keep the bare
// nomination key and would never be found by late-entry placement — rewrite
// them the same way. The running order itself is left as it is.
const SEPARATOR = '::';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE section_items si
          SET "nominationGroupKey" =
                COALESCE(e."nominationId"::text, e.nomination) || :separator || e.program
         FROM entries e
        WHERE e.id = si."entryId"
          AND e.program IS NOT NULL
          AND e.program <> ''
          AND si."nominationGroupKey" = COALESCE(e."nominationId"::text, e.nomination)`,
      { replacements: { separator: SEPARATOR } },
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `UPDATE section_items si
          SET "nominationGroupKey" = COALESCE(e."nominationId"::text, e.nomination)
         FROM entries e
        WHERE e.id = si."entryId"
          AND e.program IS NOT NULL
          AND e.program <> ''
          AND si."nominationGroupKey" =
                COALESCE(e."nominationId"::text, e.nomination) || :separator || e.program`,
      { replacements: { separator: SEPARATOR } },
    );
  },
};
