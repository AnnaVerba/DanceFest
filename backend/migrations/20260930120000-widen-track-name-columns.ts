import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

// A track's object key, public URL and display name are built from the full
// file name (participant surnames, league, style) — a group easily goes past
// varchar(255) and the upload fails on insert. TEXT has no such limit.
const TRACK_COLUMNS = [
  { column: 'originalFileName', allowNull: false },
  { column: 'objectKey', allowNull: false },
  { column: 'publicUrl', allowNull: true },
];
const ENTRY_COLUMNS = [
  { column: 'musicName', allowNull: true },
  { column: 'musicUrl', allowNull: true },
];

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    for (const { column, allowNull } of TRACK_COLUMNS) {
      await queryInterface.changeColumn('tracks', column, {
        type: DataTypes.TEXT,
        allowNull,
      });
    }
    for (const { column, allowNull } of ENTRY_COLUMNS) {
      await queryInterface.changeColumn('entries', column, {
        type: DataTypes.TEXT,
        allowNull,
      });
    }
  },

  down: async (queryInterface: QueryInterface) => {
    for (const { column, allowNull } of TRACK_COLUMNS) {
      await queryInterface.changeColumn('tracks', column, {
        type: DataTypes.STRING,
        allowNull,
      });
    }
    for (const { column, allowNull } of ENTRY_COLUMNS) {
      await queryInterface.changeColumn('entries', column, {
        type: DataTypes.STRING,
        allowNull,
      });
    }
  },
};
