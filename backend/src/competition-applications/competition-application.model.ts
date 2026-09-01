import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { Participant } from '../participants/participant.model';
import { Coach } from '../coaches/coach.model';
import { League } from '../leagues/league.model';
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

  @ForeignKey(() => Participant)
  @Column({ type: DataType.UUID, allowNull: false })
  declare participantId: string;

  @BelongsTo(() => Participant)
  declare participant: Participant;

  // Null when the application was submitted by a participant who has no
  // coach — a coach can only see applications where this matches them.
  @ForeignKey(() => Coach)
  @Column({ type: DataType.UUID, allowNull: true })
  declare coachId: string | null;

  @BelongsTo(() => Coach)
  declare coach: Coach | null;

  @ForeignKey(() => League)
  @Column({ type: DataType.UUID, allowNull: false })
  declare leagueId: string;

  @BelongsTo(() => League)
  declare league: League;

  @Column({
    type: DataType.ENUM(...Object.values(ApplicationStatus)),
    allowNull: false,
    defaultValue: ApplicationStatus.PENDING,
  })
  declare status: ApplicationStatus;
}
