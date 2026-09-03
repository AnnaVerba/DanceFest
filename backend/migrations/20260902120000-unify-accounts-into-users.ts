import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// One human = one `users` row (credentials + identity). The roles that
// human holds live in `user_roles`. Role-specific fields sit on `users`
// as nullable columns (a user has at most one of each role). ADMIN stays
// in its own `admins` table, untouched.
const USER_ROLES = ['PARTICIPANT', 'COACH', 'ORGANIZER'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('users', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      email: { type: DataTypes.STRING, allowNull: true, unique: true },
      phone: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: true },
      firstName: { type: DataTypes.STRING, allowNull: false },
      lastName: { type: DataTypes.STRING, allowNull: false },
      birthDate: { type: DataTypes.DATEONLY, allowNull: true },
      schoolId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'schools', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      coachId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

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
        onUpdate: 'CASCADE',
      },
      role: { type: DataTypes.ENUM(...USER_ROLES), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addConstraint('user_roles', {
      type: 'unique',
      fields: ['userId', 'role'],
      name: 'user_roles_userId_role_unique',
    });

    // Move the existing organizer accounts across, keeping their ids so
    // competitions.ownerId and friends stay valid.
    await queryInterface.sequelize.query(`
      INSERT INTO users (id, email, phone, "passwordHash", "firstName", "lastName", "createdAt", "updatedAt")
      SELECT id, email, phone, "passwordHash", "firstName", "lastName", NOW(), NOW() FROM organizers
    `);
    await queryInterface.sequelize.query(`
      INSERT INTO user_roles (id, "userId", role, "createdAt", "updatedAt")
      SELECT gen_random_uuid(), id, 'ORGANIZER', NOW(), NOW() FROM organizers
    `);

    // coaches / participants are empty — nothing to move, just repoint the
    // foreign keys that pointed at them.
    for (const [table, column] of [
      ['competition_applications', 'participantId'],
      ['competition_applications', 'coachId'],
      ['entries', 'participantId'],
    ] as const) {
      await queryInterface
        .removeConstraint(table, `${table}_${column}_fkey`)
        .catch(() => undefined);
    }

    await queryInterface.dropTable('participants');
    await queryInterface.dropTable('coaches');
    await queryInterface.dropTable('organizers');

    await queryInterface.addConstraint('competition_applications', {
      type: 'foreign key',
      fields: ['participantId'],
      references: { table: 'users', field: 'id' },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
      name: 'competition_applications_participantId_fkey',
    });
    await queryInterface.addConstraint('competition_applications', {
      type: 'foreign key',
      fields: ['coachId'],
      references: { table: 'users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      name: 'competition_applications_coachId_fkey',
    });
    await queryInterface.addConstraint('entries', {
      type: 'foreign key',
      fields: ['participantId'],
      references: { table: 'users', field: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
      name: 'entries_participantId_fkey',
    });

    // Every refresh token names an account in a table that may no longer
    // exist — force everyone to log in again.
    await queryInterface.sequelize.query('DELETE FROM refresh_tokens');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('organizers', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      firstName: { type: DataTypes.STRING, allowNull: false },
      lastName: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.sequelize.query(`
      INSERT INTO organizers (id, email, phone, "passwordHash", "firstName", "lastName", "createdAt", "updatedAt")
      SELECT u.id, u.email, u.phone, u."passwordHash", u."firstName", u."lastName", NOW(), NOW()
      FROM users u JOIN user_roles r ON r."userId" = u.id AND r.role = 'ORGANIZER'
    `);

    await queryInterface.createTable('coaches', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      firstName: { type: DataTypes.STRING, allowNull: false },
      lastName: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: false, unique: true },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      schoolId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'schools', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
    });
    await queryInterface.createTable('participants', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      firstName: { type: DataTypes.STRING, allowNull: false },
      lastName: { type: DataTypes.STRING, allowNull: false },
      phone: { type: DataTypes.STRING, allowNull: false, unique: true },
      email: { type: DataTypes.STRING, allowNull: true },
      passwordHash: { type: DataTypes.STRING, allowNull: true },
      birthDate: { type: DataTypes.DATEONLY, allowNull: false },
      coachId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'coaches', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    for (const [table, column] of [
      ['competition_applications', 'participantId'],
      ['competition_applications', 'coachId'],
      ['entries', 'participantId'],
    ] as const) {
      await queryInterface
        .removeConstraint(table, `${table}_${column}_fkey`)
        .catch(() => undefined);
    }

    await queryInterface.removeConstraint(
      'user_roles',
      'user_roles_userId_role_unique',
    );
    await queryInterface.dropTable('user_roles');
    await queryInterface.dropTable('users');
  },
};
