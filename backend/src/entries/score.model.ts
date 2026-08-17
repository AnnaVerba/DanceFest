import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Entry } from './entry.model';
import { Judge } from '../judges/judge.model';

@Table({ tableName: 'scores' })
export class Score extends Model<Score> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Entry)
  @Column({ type: DataType.UUID, allowNull: false })
  declare entryId: string;

  @ForeignKey(() => Judge)
  @Column({ type: DataType.UUID, allowNull: false })
  declare judgeId: string;

  @Column({ type: DataType.DECIMAL(4, 1), allowNull: false })
  declare value: number;

  @BelongsTo(() => Entry)
  declare entry: Entry;

  @BelongsTo(() => Judge)
  declare judge: Judge;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
