import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('organizer_requests', {
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
      schoolId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'schools', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      note: { type: DataTypes.TEXT, allowNull: true },
      status: {
        type: DataTypes.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      reviewedByUserId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      reviewedAt: { type: DataTypes.DATE, allowNull: true },
      decisionNote: { type: DataTypes.TEXT, allowNull: true },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });

    // At most one PENDING request per user.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX organizer_requests_one_pending_per_user
      ON organizer_requests ("userId")
      WHERE status = 'PENDING'
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('organizer_requests');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_organizer_requests_status"',
    );
  },
};
