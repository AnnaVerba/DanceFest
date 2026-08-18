import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable('entry_scores', {
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
      value: {
        type: DataTypes.DECIMAL(4, 1),
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

    // Один суддя — одна оцінка на номер; повторний PATCH оновлює її.
    await queryInterface.addIndex('entry_scores', {
      fields: ['entryId', 'judgeId'],
      name: 'entry_scores_entry_id_judge_id_idx',
      unique: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable('entry_scores');
  },
};
