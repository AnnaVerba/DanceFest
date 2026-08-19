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

  @ForeignKey(() => Venue)
  @Column({ type: DataType.UUID, allowNull: true })
  declare venueId: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  @Column({ type: DataType.DECIMAL(10, 2), allowNull: true })
  declare price: number | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: false })
  declare allowsImprovisation: boolean;

  @Column({
    type: DataType.ARRAY(DataType.UUID),
    allowNull: false,
    defaultValue: [],
  })
  declare categoryIds: string[];

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => Venue)
  declare venue: Venue;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
