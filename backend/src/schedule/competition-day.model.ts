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
import { Section } from './section.model';

@Table({ tableName: 'competition_days' })
export class CompetitionDay extends Model<CompetitionDay> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @Column({ type: DataType.DATEONLY, allowNull: false })
  declare date: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare label: string | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @HasMany(() => Section)
  declare sections: Section[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
