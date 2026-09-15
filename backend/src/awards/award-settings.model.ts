import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { AWARD_SYSTEMS, STANDARD_AWARD_SYSTEM } from './award-system';
import type { AwardSystem } from './award-system';

@Table({ tableName: 'award_settings' })
export class AwardSettings extends Model<AwardSettings> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  declare competitionId: string;

  @Column({
    type: DataType.ENUM(...AWARD_SYSTEMS),
    allowNull: false,
    defaultValue: STANDARD_AWARD_SYSTEM,
  })
  declare awardSystem: AwardSystem;

  // Organizer's hand-typed quantities, keyed by AwardLine.key. A key absent
  // here means "use the calculated value".
  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: {} })
  declare overrides: Record<string, number>;

  // The organizer's «медаль кожному» leagues for this competition only;
  // null means "as the category template says".
  @Column({ type: DataType.ARRAY(DataType.STRING), allowNull: true })
  declare allMedalLeagues: string[] | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
