import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  HasMany,
  HasOne,
  Model,
  Table,
} from 'sequelize-typescript';
import { Admin } from '../admins/admin.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Invitation } from '../team/invitation.model';
import { PaymentDetails } from '../payment-details/payment-details.model';

@Table({ tableName: 'competitions' })
export class Competition extends Model<Competition> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare image: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.TEXT, allowNull: false })
  declare description: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare location: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare organizer: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare dateFrom: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare dateTo: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare registrationFrom: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare registrationTo: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare contactNumber: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare contactEmail: string;

  // Owner is polymorphic (an Admin or an Organizer), so this column has no
  // DB-level foreign key — see migrations/20260901093000-relax-competitions-owner-fk.ts.
  @Column({ type: DataType.UUID, allowNull: false })
  declare ownerId: string;

  // Resolves to an Admin only when the owner is an Admin; null for an
  // Organizer-owned competition (Organizer has no association here).
  @BelongsTo(() => Admin, 'ownerId')
  declare owner: Admin;

  @BelongsToMany(() => Admin, () => CompetitionAdmin)
  declare admins: Admin[];

  @HasMany(() => Invitation)
  declare invitations: Invitation[];

  @HasOne(() => PaymentDetails)
  declare paymentDetails: PaymentDetails | null;
}
