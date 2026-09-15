import type { QueryInterface } from 'sequelize';
import * as bcrypt from 'bcrypt';
import { SALT_ROUNDS } from '../src/auth/auth.constants';
import { AccessLevel } from '../src/auth/access-level.enum';
import { SEED_ADMIN_PHONE_PREFIX } from '../src/app-bootstrap/app-bootstrap.constants';

// Акаунти тепер живуть в одній таблиці users; адмін — це рівень доступу.
// Як і AppBootstrapService, адмін отримує технічний телефон `admin:<id>` і
// входить поштою та паролем. Повторний запуск нічого не змінює.
const MOCK_ADMIN = {
  id: '11111111-1111-4111-8111-111111111111',
  firstName: 'Мок',
  lastName: 'Адмін',
  email: 'mock@dansefest.local',
  password: 'mock1234',
};

module.exports = {
  up: async (queryInterface: QueryInterface) => {
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
          phone: `${SEED_ADMIN_PHONE_PREFIX}${MOCK_ADMIN.id}`,
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
