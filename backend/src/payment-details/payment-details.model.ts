import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Admin } from '../admins/admin.model';
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

  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: false })
  declare adminId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare beneficiary: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare account: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare bankName: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare taxId: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare destination: string | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Admin)
  declare admin: Admin;
}
