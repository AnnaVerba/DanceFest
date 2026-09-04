import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { User } from '../users/user.model';
import { Competition } from '../competitions/competition.model';

@Table({ tableName: 'payment_details' })
export class PaymentDetails extends Model<PaymentDetails> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare adminId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare beneficiary: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare account: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare bankName: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare taxId: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare destination: string | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => User)
  declare admin: User;
}
