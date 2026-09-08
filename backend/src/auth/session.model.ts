import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'sessions' })
export class Session extends Model<Session> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.UUID, allowNull: false })
  declare userId: string;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare tokenId: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  @Column({ type: DataType.STRING, allowNull: true })
  declare fingerprint: string | null;

  @Column({ type: DataType.STRING(45), allowNull: true })
  declare ipAddress: string | null;

  @Column({ type: DataType.TEXT, allowNull: true })
  declare userAgent: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare lastUsedAt: Date | null;
}
