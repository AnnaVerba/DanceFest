import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  HasMany,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { Score } from './score.model';
import { Nomination } from '../nominations/nomination.model';
import { User } from '../users/user.model';

@Table({ tableName: 'entries' })
export class Entry extends Model<Entry> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare number: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare routineName: string;

  @ForeignKey(() => Nomination)
  @Column({ type: DataType.UUID, allowNull: true })
  declare nominationId: string | null;

  // Set when the entry was submitted through the public apply form for a
  // known participant (by the participant or by their coach). For a group
  // number this is the first of `participantIds`.
  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: true })
  declare participantId: string | null;

  // Every participant in the number. One element for a solo, many for a
  // group. Empty when the entry was added by hand without a participant.
  @Column({
    type: DataType.ARRAY(DataType.UUID),
    allowNull: false,
    defaultValue: [],
  })
  declare participantIds: string[];

  @Column({ type: DataType.STRING, allowNull: false })
  declare nomination: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare ageCategory: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare league: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare program: string | null;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare participantsCount: number | null;

  // Derived from participantsCount: Соло / Дуо / Тріо / Група.
  @Column({ type: DataType.STRING, allowNull: true })
  declare lineup: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare studioName: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare choreographer: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare city: string | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare improv: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  declare paymentMethod: string | null;

  // File name of the track for this performance. One per nomination, since
  // each nomination the applicant picked is a separate stage performance.
  @Column({ type: DataType.STRING, allowNull: true })
  declare musicName: string | null;

  @Column({ type: DataType.DECIMAL(4, 1), allowNull: true })
  declare score: number | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Nomination)
  declare nominationRef: Nomination;

  @BelongsTo(() => User)
  declare participant: User;

  @HasMany(() => Score)
  declare scores: Score[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
