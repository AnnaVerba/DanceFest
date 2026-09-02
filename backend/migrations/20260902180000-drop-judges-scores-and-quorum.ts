import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

/**
 * Judges functionality removed from the product entirely (Developer, 2026-09-02):
 * no judge accounts/login, no judge cabinet, no per-entry scoring by judges, no
 * "quorum" rule. `scores` is dropped before `judges` (its judgeId FK depends on
 * it). Entry.score (a separate, non-judge column) is untouched.
 */
module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('scores');
    await queryInterface.dropTable('judges');
    await queryInterface.removeColumn('competition_rules', 'quorum');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('competition_rules', 'quorum', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3,
    });

    await queryInterface.createTable('judges', {
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
      name: { type: DataTypes.STRING, allowNull: false },
      email: { type: DataTypes.STRING, allowNull: false },
      passwordHash: { type: DataTypes.STRING, allowNull: false },
      venueId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'venues', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('judges', {
      fields: ['email'],
      name: 'judges_email_unique_idx',
      unique: true,
    });

    await queryInterface.createTable('scores', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      entryId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'entries', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      judgeId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'judges', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      value: { type: DataTypes.DECIMAL(4, 1), allowNull: false },
      createdAt: { type: DataTypes.DATE, allowNull: false },
      updatedAt: { type: DataTypes.DATE, allowNull: false },
    });
    await queryInterface.addIndex('scores', {
      fields: ['entryId', 'judgeId'],
      name: 'scores_entry_id_judge_id_idx',
      unique: true,
    });
  },
};
