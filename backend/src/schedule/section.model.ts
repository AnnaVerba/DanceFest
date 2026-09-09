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
import { Venue } from '../venues/venue.model';
import { CompetitionDay } from './competition-day.model';
import { SectionItem } from './section-item.model';

@Table({ tableName: 'sections' })
export class Section extends Model<Section> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false })
  declare competitionId: string;

  @ForeignKey(() => CompetitionDay)
  @Column({ type: DataType.UUID, allowNull: false })
  declare dayId: string;

  @ForeignKey(() => Venue)
  @Column({ type: DataType.UUID, allowNull: true })
  declare venueId: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare name: string;

  // "HH:MM", 24h. The only clock value the organizer types by hand.
  @Column({ type: DataType.STRING, allowNull: false })
  declare startTime: string;

  // Pause copied from competition_rules when the section is built or
  // recalculated. Frozen so a later rules change does not silently reflow
  // the running order mid-festival.
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare pauseSeconds: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare sortOrder: number;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @BelongsTo(() => CompetitionDay)
  declare day: CompetitionDay;

  @BelongsTo(() => Venue)
  declare venue: Venue | null;

  @HasMany(() => SectionItem)
  declare items: SectionItem[];

  @Column(DataType.DATE)
  declare createdAt: Date;
}
