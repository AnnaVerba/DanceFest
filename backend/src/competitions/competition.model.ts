import {
  BelongsTo,
  BelongsToMany,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Admin } from '../admins/admin.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Invitation } from '../team/invitation.model';

@Table({ tableName: 'competitions' })
export class Competition extends Model<Competition> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare date: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare location: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare style: string;

  @ForeignKey(() => Admin)
  @Column({ type: DataType.UUID, allowNull: false })
  declare ownerId: string;

  @BelongsTo(() => Admin, 'ownerId')
  declare owner: Admin;

  @BelongsToMany(() => Admin, () => CompetitionAdmin)
  declare admins: Admin[];

  @HasMany(() => Invitation)
  declare invitations: Invitation[];
}
