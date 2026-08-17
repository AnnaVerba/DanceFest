import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';

@Table({ tableName: 'nominations' })
export class Nomination extends Model<Nomination> {
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

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare price: number | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
