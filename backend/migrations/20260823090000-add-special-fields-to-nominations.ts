import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn('nominations', 'isSpecial', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('nominations', 'exitMode', {
      type: DataTypes.ENUM('single', 'per_program'),
      allowNull: false,
      defaultValue: 'single',
    });

    await queryInterface.addColumn('nominations', 'durationLimitSeconds', {
      type: DataTypes.INTEGER,
      allowNull: true,
    });

    await queryInterface.addColumn('nominations', 'programLimits', {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    });

    await queryInterface.addColumn('template_nominations', 'isSpecial', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    await queryInterface.addColumn('template_nominations', 'exitMode', {
      type: DataTypes.ENUM('single', 'per_program'),
      allowNull: false,
      defaultValue: 'single',
    });

    await queryInterface.addColumn('entries', 'nominationId', {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'nominations', key: 'id' },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addIndex('entries', {
      fields: ['nominationId'],
      name: 'entries_nomination_id_idx',
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex('entries', 'entries_nomination_id_idx');
    await queryInterface.removeColumn('entries', 'nominationId');

    await queryInterface.removeColumn('template_nominations', 'exitMode');
    await queryInterface.removeColumn('template_nominations', 'isSpecial');

    await queryInterface.removeColumn('nominations', 'programLimits');
    await queryInterface.removeColumn('nominations', 'durationLimitSeconds');
    await queryInterface.removeColumn('nominations', 'exitMode');
    await queryInterface.removeColumn('nominations', 'isSpecial');

    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_nominations_exitMode";',
    );
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_template_nominations_exitMode";',
    );
  },
};
