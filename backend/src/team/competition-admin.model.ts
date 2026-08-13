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

/** Зв'язка «конкурс — адміністратор, що має доступ». Власник тут не зберігається. */
@Table({ tableName: 'competition_admins' })
export class CompetitionAdmin extends Model<CompetitionAdmin> {
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

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Admin)
  declare admin: Admin;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
