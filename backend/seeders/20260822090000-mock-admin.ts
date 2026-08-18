import type { QueryInterface } from 'sequelize';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

const MOCK_ADMIN = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Мок Адмін',
  email: 'mock@dansefest.local',
  password: 'mock1234',
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const now = new Date();

    await queryInterface.bulkInsert('admins', [
      {
        id: MOCK_ADMIN.id,
        name: MOCK_ADMIN.name,
        email: MOCK_ADMIN.email,
        passwordHash: await bcrypt.hash(MOCK_ADMIN.password, SALT_ROUNDS),
        createdAt: now,
        updatedAt: now,
      },
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('admins', { email: MOCK_ADMIN.email });
  },
};
