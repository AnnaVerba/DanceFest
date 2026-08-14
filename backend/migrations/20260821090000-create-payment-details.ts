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
      // Картка отримувача зберігається як є (без маскування) — вона й так
      // публікується учасникам для переказу внеску, тобто не є секретом.
      // Це не платіжні дані платника (немає CVV/строку дії), тож поза
      // межами PCI DSS; маскування лише завадило б скопіювати номер.
      cardNumber: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      iban: {
        type: DataTypes.STRING,
        allowNull: true,
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

    // Один конкурс — одні реквізити.
    await queryInterface.addIndex(TABLE, {
      fields: ['competitionId'],
      name: 'payment_details_competition_id_unique',
      unique: true,
    });

    // Бекфіл зі старих колонок competitions.payment* (додані в
    // 20260815090000). paymentAccount містив або картку, або IBAN в одному
    // полі — розкладаємо за виглядом значення (IBAN починається з 2 літер
    // коду країни, картка — цифри). UUID генеруємо в JS, щоб не залежати
    // від розширення pgcrypto на боці бази.
    const rows = await queryInterface.sequelize.query<{
      id: string;
      ownerId: string;
      paymentRecipient: string;
      paymentAccount: string | null;
      paymentBank: string | null;
      paymentTaxId: string | null;
      paymentPurpose: string | null;
    }>(
      `SELECT id, "ownerId", "paymentRecipient", "paymentAccount", "paymentBank", "paymentTaxId", "paymentPurpose"
       FROM competitions WHERE "paymentRecipient" IS NOT NULL`,
      { type: QueryTypes.SELECT },
    );

    if (rows.length > 0) {
      const isIban = (value: string) => /^[A-Za-z]{2}/.test(value);
      await queryInterface.bulkInsert(
        TABLE,
        rows.map((row) => ({
          id: randomUUID(),
          competitionId: row.id,
          adminId: row.ownerId,
          beneficiary: row.paymentRecipient,
          cardNumber:
            row.paymentAccount && !isIban(row.paymentAccount)
              ? row.paymentAccount
              : null,
          iban:
            row.paymentAccount && isIban(row.paymentAccount)
              ? row.paymentAccount
              : null,
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
