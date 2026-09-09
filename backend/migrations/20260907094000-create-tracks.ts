import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('tracks', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      // One track per entry — enforced below with a unique index, since
      // re-upload replaces the row rather than adding one.
      performanceId: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        references: { model: 'entries', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      originalFileName: { type: DataTypes.STRING, allowNull: false },
      // Key of the object in OCP Object Storage (see OCP_BUCKET_ENV_KEY).
      objectKey: { type: DataTypes.STRING, allowNull: false },
      mimeType: { type: DataTypes.STRING, allowNull: false },
      durationSeconds: { type: DataTypes.INTEGER, allowNull: false },
      sizeBytes: { type: DataTypes.INTEGER, allowNull: false },
      uploadedByUserId: {
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
    await queryInterface.dropTable('tracks');
  },
};
