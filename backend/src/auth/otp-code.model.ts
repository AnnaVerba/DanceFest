import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'otp_codes' })
export class OtpCode extends Model<OtpCode> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare phone: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare codeHash: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare attempts: number;

  @Column({ type: DataType.DATE, allowNull: true })
  declare consumedAt: Date | null;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
