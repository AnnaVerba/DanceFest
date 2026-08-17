import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';

@Table({ tableName: 'venues' })
export class Venue extends Model<Venue> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare description: string | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
