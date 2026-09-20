import type { QueryInterface } from 'sequelize';

const SECTIONS = 'sections';
const SECTION_ITEMS = 'section_items';
const PERFORMANCE = 'performance';

// Every venue runs its own program per day, so a section now owns its venue
// (sections.venueId, until now a legacy free pick nobody read). Each
// existing section takes the venue it was shown under — its first
// performance's nomination venue, null when it has none — and section order
// restarts per day + venue, keeping the old relative order.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.sequelize.query(`
      UPDATE "${SECTIONS}" AS section
         SET "venueId" = (
           SELECT nomination."venueId"
             FROM "${SECTION_ITEMS}" AS item
             JOIN entries AS entry ON entry.id = item."entryId"
             JOIN nominations AS nomination ON nomination.id = entry."nominationId"
            WHERE item."sectionId" = section.id
              AND item.type = '${PERFORMANCE}'
            ORDER BY item."sortOrder"
            LIMIT 1
         )`);

    await queryInterface.sequelize.query(`
      UPDATE "${SECTIONS}" AS section
         SET "sortOrder" = ranked.position
        FROM (
          SELECT id,
                 ROW_NUMBER() OVER (
                   PARTITION BY "dayId", "venueId"
                   ORDER BY "sortOrder", "createdAt"
                 ) - 1 AS position
            FROM "${SECTIONS}"
        ) AS ranked
       WHERE section.id = ranked.id`);
  },

  // A data backfill: the legacy picks and the day-wide order it replaced are
  // not kept, and the new values are valid under the old code too.
  down: async () => {},
};
