import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Fly is a plain SMS sender, not a verify service — we own code
    // generation/expiry/attempts again.
    await queryInterface.renameTable('otp_send_log', 'otp_codes');
    await queryInterface.addColumn('otp_codes', 'codeHash', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('otp_codes', 'expiresAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
    await queryInterface.sequelize.query(
      'UPDATE "otp_codes" SET "expiresAt" = NOW() WHERE "expiresAt" IS NULL',
    );
    await queryInterface.changeColumn('otp_codes', 'expiresAt', {
      type: DataTypes.DATE,
      allowNull: false,
    });
    await queryInterface.addColumn('otp_codes', 'attempts', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn('otp_codes', 'consumedAt', {
      type: DataTypes.DATE,
      allowNull: true,
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn('otp_codes', 'codeHash');
    await queryInterface.removeColumn('otp_codes', 'expiresAt');
    await queryInterface.removeColumn('otp_codes', 'attempts');
    await queryInterface.removeColumn('otp_codes', 'consumedAt');
    await queryInterface.renameTable('otp_codes', 'otp_send_log');
  },
};
