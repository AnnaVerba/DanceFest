import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const ACCESS_LEVELS = ['PARTICIPANT', 'COACH', 'ORGANIZER', 'ADMIN'];

// Replace the user_roles set + separate admins table with a single
// `accessLevel` ladder on `users`.
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const users = await queryInterface.describeTable('users');
    if (!users.accessLevel) {
      await queryInterface.addColumn('users', 'accessLevel', {
        type: DataTypes.ENUM(...ACCESS_LEVELS),
        allowNull: false,
        defaultValue: 'PARTICIPANT',
      });
    }

    const T = '"enum_users_accessLevel"';

    // Backfill each user's level from the highest role they held.
    await queryInterface.sequelize.query(`
      UPDATE users u SET "accessLevel" = sub.level::${T} FROM (
        SELECT "userId",
          CASE
            WHEN bool_or(role = 'ORGANIZER') THEN 'ORGANIZER'
            WHEN bool_or(role = 'COACH') THEN 'COACH'
            ELSE 'PARTICIPANT'
          END AS level
        FROM user_roles GROUP BY "userId"
      ) sub WHERE sub."userId" = u.id
    `);

    const ADMIN_FKS = [
      ['competition_admins', 'adminId'],
      ['category_templates', 'authorId'],
      ['payment_details', 'adminId'],
      ['invitations', 'invitedByAdminId'],
    ] as const;

    // Drop the FKs that point at `admins` before we move data around.
    for (const [table, column] of ADMIN_FKS) {
      await queryInterface
        .removeConstraint(table, `${table}_${column}_fkey`)
        .catch(() => undefined);
    }

    // Fold the admins table into users. An admin whose email already has a
    // user row (same human who was also an organizer) is merged: that user
    // becomes ADMIN and everything pointing at the old admin id is
    // repointed. Admins with no user row are brought in as-is, keeping
    // their id so admin-owned rows stay valid; they log in by email, so a
    // placeholder phone is fine.
    await queryInterface.sequelize.query(`
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT a.id AS admin_id, u.id AS user_id
                 FROM admins a JOIN users u ON u.email = a.email LOOP
          UPDATE competitions SET "ownerId" = r.user_id WHERE "ownerId" = r.admin_id;
          UPDATE category_templates SET "authorId" = r.user_id WHERE "authorId" = r.admin_id;
          UPDATE payment_details SET "adminId" = r.user_id WHERE "adminId" = r.admin_id;
          UPDATE competition_admins SET "adminId" = r.user_id WHERE "adminId" = r.admin_id;
          UPDATE invitations SET "invitedByAdminId" = r.user_id WHERE "invitedByAdminId" = r.admin_id;
          UPDATE users SET "accessLevel" = 'ADMIN'::${T} WHERE id = r.user_id;
        END LOOP;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO users (id, email, phone, "passwordHash", "firstName", "lastName", "accessLevel", "createdAt", "updatedAt")
      SELECT a.id, a.email, 'admin:' || a.id,
             a."passwordHash",
             split_part(a.name, ' ', 1),
             COALESCE(NULLIF(substring(a.name from position(' ' in a.name) + 1), ''), 'Адмін'),
             'ADMIN'::${T}, NOW(), NOW()
      FROM admins a
      WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.email = a.email)
    `);

    for (const [table, column] of ADMIN_FKS) {
      await queryInterface.addConstraint(table, {
        type: 'foreign key',
        fields: [column],
        references: { table: 'users', field: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
        name: `${table}_${column}_fkey`,
      });
    }

    await queryInterface
      .removeConstraint('user_roles', 'user_roles_userId_role_unique')
      .catch(() => undefined);
    await queryInterface.dropTable('user_roles');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_user_roles_role"',
    );
    await queryInterface.dropTable('admins');

    await queryInterface.sequelize.query('DELETE FROM refresh_tokens');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('admins', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
    });
    await queryInterface.sequelize.query(`
      INSERT INTO admins (id, name, email, "passwordHash")
      SELECT id, "firstName" || ' ' || "lastName", email, "passwordHash"
      FROM users WHERE "accessLevel" = 'ADMIN' AND email IS NOT NULL
    `);

    await queryInterface.createTable('user_roles', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      role: {
        type: DataTypes.ENUM('PARTICIPANT', 'COACH', 'ORGANIZER'),
        allowNull: false,
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    await queryInterface.removeColumn('users', 'accessLevel');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_users_accessLevel"',
    );
  },
};
