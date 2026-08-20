import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

const TABLE = 'duration_limits';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable(TABLE, {
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
      nominationId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'nominations', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      categoryId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: { model: 'categories', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      round: {
        type: DataTypes.ENUM('final', 'semifinal'),
        allowNull: false,
        defaultValue: 'final',
      },
      seconds: {
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

    // A limit is set either on one exact nomination or on one axis category —
    // never both, never neither (§BE-9: "nominationId — null, якщо ліміт
    // заданий на вісь").
    await queryInterface.sequelize.query(`
      ALTER TABLE ${TABLE}
      ADD CONSTRAINT duration_limits_scope_check
      CHECK (
        (("nominationId" IS NOT NULL)::int + ("categoryId" IS NOT NULL)::int) = 1
      )
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX duration_limits_nomination_round_unique
        ON ${TABLE} ("competitionId", "nominationId", "round")
        WHERE "nominationId" IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX duration_limits_category_round_unique
        ON ${TABLE} ("competitionId", "categoryId", "round")
        WHERE "categoryId" IS NOT NULL
    `);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_duration_limits_round"',
    );
  },
};
