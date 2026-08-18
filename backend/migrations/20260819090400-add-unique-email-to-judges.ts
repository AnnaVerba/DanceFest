import type { QueryInterface } from 'sequelize';

const TABLE = 'judges';
const OLD_INDEX = 'judges_competition_id_email_idx';
const NEW_INDEX = 'judges_email_unique_idx';

module.exports = {
  // Логін судді відбувається лише за email (без competitionId у URL), тож
  // email мусить бути унікальним у межах усієї таблиці, а не тільки в
  // межах конкурсу — інакше логін був би неоднозначним.
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(TABLE, OLD_INDEX).catch(() => undefined);
    await queryInterface.addIndex(TABLE, {
      fields: ['email'],
      name: NEW_INDEX,
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex(TABLE, NEW_INDEX).catch(() => undefined);
    await queryInterface.addIndex(TABLE, {
      fields: ['competitionId', 'email'],
      name: OLD_INDEX,
    });
  },
};
