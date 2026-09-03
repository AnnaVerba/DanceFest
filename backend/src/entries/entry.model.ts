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

  @Column({ type: DataType.DECIMAL(4, 1), allowNull: true })
  declare score: number | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Nomination)
  declare nominationRef: Nomination;

  @HasMany(() => Score)
  declare scores: Score[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
