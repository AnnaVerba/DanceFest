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
import { EntryScore } from './entry-score.model';

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

  // Знімок назви номінації на момент подання — не FK, щоб заявка лишалась
  // читабельною, навіть якщо організатор пізніше перейменує/видалить номінацію.
  @Column({ type: DataType.STRING, allowNull: false })
  declare nomination: string;

  // Форма подачі заявки поки не збирає ці три поля — лишені для ручного
  // редагування/майбутніх форм, тому необов'язкові.
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

  @Column({ type: DataType.ENUM('cash', 'card'), allowNull: true })
  declare paymentMethod: 'cash' | 'card' | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @HasMany(() => EntryScore)
  declare scores: EntryScore[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
