import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('invitations', {
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
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      token: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      status: {
        type: DataTypes.ENUM('pending', 'accepted', 'revoked', 'expired'),
        allowNull: false,
        defaultValue: 'pending',
      },
      invitedByAdminId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'admins', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });

    await queryInterface.addIndex('invitations', {
      fields: ['competitionId', 'email'],
      name: 'invitations_competition_id_email_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('invitations');
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_invitations_status";',
    );
  },
};
