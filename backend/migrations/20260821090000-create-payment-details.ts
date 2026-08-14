import type { QueryInterface } from 'sequelize';
import { DataTypes, QueryTypes } from 'sequelize';
import { randomUUID } from 'crypto';

const TABLE = 'payment_details';

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
      adminId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'admins', key: 'id' },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      },
      beneficiary: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      account: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      bankName: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      taxId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      destination: {
        type: DataTypes.STRING,
        allowNull: true,
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
      name: 'payment_details_competition_id_unique',
      unique: true,
    });

    const rows = await queryInterface.sequelize.query<{
      id: string;
      ownerId: string;
      paymentRecipient: string;
      paymentAccount: string;
      paymentBank: string | null;
      paymentTaxId: string | null;
      paymentPurpose: string | null;
    }>(
      `SELECT id, "ownerId", "paymentRecipient", "paymentAccount", "paymentBank", "paymentTaxId", "paymentPurpose"
       FROM competitions WHERE "paymentRecipient" IS NOT NULL AND "paymentAccount" IS NOT NULL`,
      { type: QueryTypes.SELECT },
    );

    if (rows.length > 0) {
      await queryInterface.bulkInsert(
        TABLE,
        rows.map((row) => ({
          id: randomUUID(),
          competitionId: row.id,
          adminId: row.ownerId,
          beneficiary: row.paymentRecipient,
          account: row.paymentAccount,
          bankName: row.paymentBank,
          taxId: row.paymentTaxId,
          destination: row.paymentPurpose,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      );
    }
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable(TABLE);
  },
};
