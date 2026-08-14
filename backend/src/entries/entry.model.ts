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

  // Категорії конкурсу — довільні осі (див. nominations), тому ці три поля
  // більше не гарантовано заповнені окремо від назви номінації.
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

  // Застаріле пряме поле — з появою per-суддівських Score більше не пишеться;
  // лишається лише для сумісності зі старими рядками.
  @Column({ type: DataType.DECIMAL(4, 1), allowNull: true })
  declare score: number | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @HasMany(() => Score)
  declare scores: Score[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
