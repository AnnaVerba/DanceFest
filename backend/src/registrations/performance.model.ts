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
import { Score } from '../entries/score.model';
import { Registration } from './registration.model';

export type PerformanceRound = 'final' | 'semifinal';
export type PerformanceStatus = 'scheduled' | 'absent' | 'withdrawn';

@Table({ tableName: 'performances' })
export class Performance extends Model<Performance> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Registration)
  @Column({ type: DataType.UUID, allowNull: false })
  declare registrationId: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare programName: string | null;

  @Column({
    type: DataType.ENUM('final', 'semifinal'),
    allowNull: false,
    defaultValue: 'final',
  })
  declare round: PerformanceRound;

  @Column({
    type: DataType.ENUM('scheduled', 'absent', 'withdrawn'),
    allowNull: false,
    defaultValue: 'scheduled',
  })
  declare status: PerformanceStatus;

  @BelongsTo(() => Registration)
  declare registration: Registration;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @HasMany(() => Score)
  declare scores: Score[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
