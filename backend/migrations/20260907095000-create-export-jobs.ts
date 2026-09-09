import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const STATUSES = ['queued', 'processing', 'completed', 'failed'];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('export_jobs', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      competitionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'competitions', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      venueId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'venues', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      status: {
        type: DataTypes.ENUM(...STATUSES),
        allowNull: false,
        defaultValue: 'queued',
      },
      progress: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      // Key of the finished .zip in OCP Object Storage — null until completed.
      objectKey: { type: DataTypes.STRING, allowNull: true },
      // [{number, dancerName}] — entries skipped because they had no track.
      missing: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
      expiresAt: { type: DataTypes.DATE, allowNull: true },
      errorMessage: { type: DataTypes.STRING, allowNull: true },
      requestedByUserId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'RESTRICT',
        onUpdate: 'CASCADE',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('export_jobs');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_export_jobs_status"',
    );
  },
};
