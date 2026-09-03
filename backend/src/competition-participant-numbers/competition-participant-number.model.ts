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

// One stable number per person within a competition, issued on the first
// application and reused by every later application of the same person.
@Table({ tableName: 'competition_participant_numbers' })
export class CompetitionParticipantNumber extends Model<CompetitionParticipantNumber> {
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

  // A person is a `users` row — accounts were unified, there is no separate
  // persons table.
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare personId: string;

  @BelongsTo(() => User, 'personId')
  declare person: User;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare number: number;
}
