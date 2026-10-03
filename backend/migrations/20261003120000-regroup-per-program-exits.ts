import type { QueryInterface } from 'sequelize';

// Programs formed before per-program group keys ran a per-program
// nomination's exits participant by participant, so its styles alternate
// (Імпровізація, Raks al Sharki, Імпровізація, …) and every exit became a
// block of its own once 20261002100000 split the keys. Within each run of
// one nomination's consecutive exits, its styles are gathered back together:
// in the order each style first appears, every exit keeping its order inside
// its style. The run reuses its own positions, so nothing outside it moves.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(
      `WITH ordered AS (
         SELECT si.id, si."sectionId", si."sortOrder",
                si."nominationGroupKey" AS key,
                CASE WHEN si.type = 'performance'
                     THEN e."nominationId"::text END AS nomination
           FROM section_items si
           LEFT JOIN entries e ON e.id = si."entryId"
       ),
       flagged AS (
         SELECT *,
                CASE WHEN nomination IS NOT NULL
                      AND nomination = LAG(nomination) OVER w
                     THEN 0 ELSE 1 END AS starts_run
           FROM ordered
         WINDOW w AS (PARTITION BY "sectionId" ORDER BY "sortOrder", id)
       ),
       runs AS (
         SELECT *,
                SUM(starts_run) OVER (PARTITION BY "sectionId"
                                      ORDER BY "sortOrder", id) AS run
           FROM flagged
       ),
       keyed AS (
         SELECT *,
                MIN("sortOrder") OVER (PARTITION BY "sectionId", run, key)
                  AS key_first
           FROM runs
       ),
       slotted AS (
         SELECT id, "sectionId", run, "sortOrder",
                ROW_NUMBER() OVER (PARTITION BY "sectionId", run
                                   ORDER BY "sortOrder", id) AS slot,
                ROW_NUMBER() OVER (PARTITION BY "sectionId", run
                                   ORDER BY key_first, "sortOrder", id) AS target
           FROM keyed
       )
       UPDATE section_items si
          SET "sortOrder" = place."sortOrder"
         FROM slotted moved
         JOIN slotted place
           ON place."sectionId" = moved."sectionId"
          AND place.run = moved.run
          AND place.slot = moved.target
        WHERE si.id = moved.id
          AND si."sortOrder" <> place."sortOrder"`,
    );
  },

  // The interleaved order is not worth restoring.
  down: async () => {},
};
