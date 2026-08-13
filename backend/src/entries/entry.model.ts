import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';

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

  // Порядковий номер заявки в межах конкурсу, присвоюється при поданні.
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare number: number;

  @Column({ type: DataType.STRING, allowNull: false })
  declare routineName: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare nomination: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare ageCategory: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare league: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare program: string;

  @Column({ type: DataType.INTEGER, allowNull: true })
  declare participantsCount: number | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare studioName: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare choreographer: string;

  // Виставляється суддями окремо; тут лише відображається.
  @Column({ type: DataType.DECIMAL(4, 1), allowNull: true })
  declare score: number | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
