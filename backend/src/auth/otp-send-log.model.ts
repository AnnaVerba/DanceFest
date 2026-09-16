import { Column, DataType, Model, Table } from 'sequelize-typescript';

// Tracks when a code was sent per phone, to enforce our own resend cooldown
// and hourly limit. Twilio Verify owns the code itself (generation, expiry,
// check attempts) — this table never stores a code.
@Table({ tableName: 'otp_send_log' })
export class OtpSendLog extends Model<OtpSendLog> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare phone: string;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
