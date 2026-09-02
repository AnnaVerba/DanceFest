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

export const INVITATION_STATUSES = [
  'pending',
  'accepted',
  'revoked',
  'expired',
] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];
export const DEFAULT_INVITATION_STATUS: InvitationStatus =
  INVITATION_STATUSES[0];
export const PENDING_INVITATION_STATUS: InvitationStatus = 'pending';
export const REVOKED_INVITATION_STATUS: InvitationStatus = 'revoked';

@Table({ tableName: 'invitations' })
export class Invitation extends Model<Invitation> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare name: string | null;

  @Column({ type: DataType.STRING, allowNull: false, unique: true })
  declare token: string;

  @Column({
    type: DataType.ENUM(...INVITATION_STATUSES),
    allowNull: false,
    defaultValue: DEFAULT_INVITATION_STATUS,
  })
  declare status: InvitationStatus;

  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: true })
  declare invitedByAdminId: string | null;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expiresAt: Date;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Admin, 'invitedByAdminId')
  declare invitedBy: Admin;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
