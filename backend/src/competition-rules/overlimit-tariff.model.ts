import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';

@Table({ tableName: 'overlimit_tariffs' })
export class OverlimitTariff extends Model<OverlimitTariff> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  // Overrun-up-to-N-seconds bracket, e.g. {30, 150} or {60, 200}.
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare uptoSeconds: number;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: false })
  declare price: number;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
