import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { Venue } from '../venues/venue.model';

@Table({ tableName: 'judges' })
export class Judge extends Model<Judge> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  // Майданчик, за яким закріплений суддя; кожен майданчик має свою групу
  // суддів (необов'язково — не всі конкурси розподіляють суддів по сценах).
  @ForeignKey(() => Venue)
  @Column({ type: DataType.UUID, allowNull: true })
  declare venueId: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare email: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare passwordHash: string;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Venue)
  declare venue: Venue;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
