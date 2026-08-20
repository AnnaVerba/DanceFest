import type { QueryInterface } from 'sequelize';
import { DataTypes, QueryTypes } from 'sequelize';
import { randomUUID } from 'crypto';

const TABLE = 'competition_rules';

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
      pauseSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 20,
      },
      timeSource: {
        type: DataTypes.ENUM('track', 'limit'),
        allowNull: false,
        defaultValue: 'limit',
      },
      surchargesEnabled: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      coachPercent: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 0,
      },
      semifinalThreshold: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 12,
      },
      improvGroupSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
      },
      improvIndividualSeconds: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 30,
      },
      quorum: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 3,
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
      fields: ['competitionId'],
      name: 'competition_rules_competition_id_unique',
      unique: true,
    });

    // Competitions created before this migration get a rules row with the
    // defaults too, so "every competition has rules" holds for existing data.
    const competitions = await queryInterface.sequelize.query<{ id: string }>(
      `SELECT id FROM competitions`,
      { type: QueryTypes.SELECT },
    );

    if (competitions.length > 0) {
      await queryInterface.bulkInsert(
        TABLE,
        competitions.map((c) => ({
          id: randomUUID(),
          competitionId: c.id,
          pauseSeconds: 20,
          timeSource: 'limit',
          surchargesEnabled: false,
          coachPercent: 0,
          semifinalThreshold: 12,
          improvGroupSeconds: 60,
          improvIndividualSeconds: 30,
          quorum: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_competition_rules_timeSource"',
    );
  },
};
