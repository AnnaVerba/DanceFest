import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { User } from '../users/user.model';
import { Category } from '../categories/category.model';
import { ApplicationStatus } from './application-status.enum';

@Table({ tableName: 'competition_applications' })
export class CompetitionApplication extends Model<CompetitionApplication> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare participantId: string;

  @BelongsTo(() => User, 'participantId')
  declare participant: User;

  // Null when the application was submitted by a participant who has no
  // coach — a coach can only see applications where this matches them.
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare coachId: string | null;

  @BelongsTo(() => User, 'coachId')
  declare coach: User | null;

  // Ліга — це категорія осі 'level' (LEAGUE_CATEGORY_TYPE), а не окрема
  // таблиця: див. competition-applications.service.ts.
  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: false })
  declare leagueId: string;

  @BelongsTo(() => Category)
  declare league: Category;

  @Column({
    type: DataType.ENUM(...Object.values(ApplicationStatus)),
    allowNull: false,
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: ApplicationStatus;
}
