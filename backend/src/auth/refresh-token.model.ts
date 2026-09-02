import { Column, DataType, Model, Table } from 'sequelize-typescript';

@Table({ tableName: 'refresh_tokens' })
export class RefreshToken extends Model<RefreshToken> {
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
}
