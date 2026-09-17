import type { QueryInterface } from 'sequelize';

// `entries.participantIds` (UUID[]) is queried with the array-overlap
// operator in EntriesService.listForUser ("my entries" / "my program").
// Without a GIN index that predicate is a sequential scan of the whole
// table; the index turns it into an index scan.
const TABLE = 'entries';
const COLUMN = 'participantIds';
const INDEX_NAME = 'entries_participant_ids_gin';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addIndex(TABLE, {
      fields: [COLUMN],
      using: 'gin',
      name: INDEX_NAME,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(TABLE, INDEX_NAME);
  },
};
