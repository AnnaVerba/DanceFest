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

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare adminId: string;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => User)
  declare admin: User;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
