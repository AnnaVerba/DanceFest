import type { QueryInterface } from 'sequelize';
import { DataTypes } from 'sequelize';

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // Twilio Verify now owns code generation/expiry/attempts; we only keep
    // a send timestamp per phone, for our own resend cooldown + hourly limit.
    await queryInterface.removeColumn('otp_codes', 'codeHash');
    await queryInterface.removeColumn('otp_codes', 'expiresAt');
    await queryInterface.removeColumn('otp_codes', 'attempts');
    await queryInterface.removeColumn('otp_codes', 'consumedAt');
    await queryInterface.renameTable('otp_codes', 'otp_send_log');
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.renameTable('otp_send_log', 'otp_codes');
    await queryInterface.addColumn('otp_codes', 'codeHash', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
    await queryInterface.addColumn('otp_codes', 'expiresAt', {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
};
