import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'section_items';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      sectionId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'sections', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      entryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'entries', key: 'id' },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE',
      },
      type: {
        type: DataTypes.ENUM('performance', 'award'),
        allowNull: false,
      },
      nominationGroupKey: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      mergedGroupLabel: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      durationSeconds: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      sortOrder: {
        type: DataTypes.INTEGER,
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

    await queryInterface.addIndex(TABLE, {
      fields: ['sectionId', 'sortOrder'],
      name: 'section_items_section_sort_idx',
    });

    // One exit belongs to at most one section.
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX section_items_entry_unique
        ON ${TABLE} ("entryId")
        WHERE "entryId" IS NOT NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_section_items_type"',
    );
  },
};
