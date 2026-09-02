import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';

export const TIME_SOURCES = ['track', 'limit'] as const;
export type TimeSource = (typeof TIME_SOURCES)[number];

@Table({ tableName: 'competition_rules' })
export class CompetitionRule extends Model<CompetitionRule> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 20 })
  declare pauseSeconds: number;

  @Column({
    type: DataType.ENUM(...TIME_SOURCES),
    allowNull: false,
    defaultValue: 'limit',
  })
  declare timeSource: TimeSource;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare surchargesEnabled: boolean;

  @Column({ type: DataType.DECIMAL(5, 2), allowNull: false, defaultValue: 0 })
  declare coachPercent: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 12 })
  declare semifinalThreshold: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 60 })
  declare improvGroupSeconds: number;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 30 })
  declare improvIndividualSeconds: number;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
