import type { QueryInterface } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../src/auth/auth.constants';
import { AccessLevel } from '../src/auth/access-level.enum';
import { assertMockSeedAllowed } from './utils/assert-mock-seed-allowed';

// Акаунти тепер живуть в одній таблиці users; адмін — це рівень доступу.
// Вхід лише за телефоном, тож мок-адмін має справжній номер у форматі E.164.
// Повторний запуск нічого не змінює.
const MOCK_ADMIN = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Мок',
  lastName: 'Адмін',
  email: 'mock@dansefest.local',
  phone: '+380500000001',
  password: 'mock1234',
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    assertMockSeedAllowed();
    const now = new Date();

    await queryInterface.sequelize.query(
      `INSERT INTO users
           (id, email, phone, "passwordHash", "firstName", "lastName",
            "accessLevel", confirmed, "createdAt", "updatedAt")
         VALUES (:id, :email, :phone, :passwordHash, :firstName, :lastName,
                 CAST(:accessLevel AS "enum_users_accessLevel"), true, :now, :now)
         ON CONFLICT DO NOTHING`,
      {
        replacements: {
          id: MOCK_ADMIN.id,
          email: MOCK_ADMIN.email,
          phone: MOCK_ADMIN.phone,
          passwordHash: await bcrypt.hash(MOCK_ADMIN.password, SALT_ROUNDS),
          firstName: MOCK_ADMIN.firstName,
          lastName: MOCK_ADMIN.lastName,
          accessLevel: AccessLevel.ADMIN,
          now,
        },
      },
    );
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.bulkDelete('users', { id: MOCK_ADMIN.id });
  },
};
