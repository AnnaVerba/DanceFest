import type { QueryInterface } from 'sequelize';
import { randomUUID } from 'crypto';

const LEAGUES = [
  { name: 'Аматорська ліга', description: 'Для початківців та аматорів' },
  { name: 'Професійна ліга', description: 'Для досвідчених танцюристів' },
  { name: 'Дитяча ліга', description: 'Для учасників до 12 років' },
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert(
      'leagues',
      LEAGUES.map((league) => ({
        id: randomUUID(),
        name: league.name,
        description: league.description,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      })),
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('leagues', {
      name: LEAGUES.map((league) => league.name),
    });
  },
};
