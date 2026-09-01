import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Category } from '../categories/category.model';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';

export const DURATION_ROUNDS = ['final', 'semifinal'] as const;
export type DurationRound = (typeof DURATION_ROUNDS)[number];

@Table({ tableName: 'duration_limits' })
export class DurationLimit extends Model<DurationLimit> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @ForeignKey(() => Nomination)
  @Column({ type: DataType.UUID, allowNull: true })
  declare nominationId: string | null;

  @ForeignKey(() => Category)
  @Column({ type: DataType.UUID, allowNull: true })
  declare categoryId: string | null;

  @Column({
    type: DataType.ENUM(...DURATION_ROUNDS),
    allowNull: false,
    defaultValue: 'final',
  })
  declare round: DurationRound;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare seconds: number;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Nomination)
  declare nomination: Nomination | null;

  @BelongsTo(() => Category)
  declare category: Category | null;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
