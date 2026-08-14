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

/**
 * Банківські реквізити для прийому оплати за конкурс.
 * Один конкурс — одні реквізити (унікальний competitionId).
 */
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

  /** Адмін, який востаннє вносив/оновлював ці реквізити. */
  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: false })
  declare adminId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare beneficiary: string;

  // Номер картки отримувача зберігається як є, без маскування. Це не дані
  // платника (немає CVV/строку дії) — картка й так публікується учасникам,
  // щоб вони могли переказати внесок, тож маскування лише заважало б
  // скопіювати номер. Поза межами PCI DSS, оскільки платежі карткою тут не
  // обробляються — це реквізити для прямого P2P-переказу.
  @Column({ type: DataType.STRING, allowNull: true })
  declare cardNumber: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare iban: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare bankName: string | null;

  /** ЄДРПОУ / ІПН отримувача. */
  @Column({ type: DataType.STRING, allowNull: true })
  declare taxId: string | null;

  /** Призначення платежу. */
  @Column({ type: DataType.STRING, allowNull: true })
  declare destination: string | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Admin)
  declare admin: Admin;
}
