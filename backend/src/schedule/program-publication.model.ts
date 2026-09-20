import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Competition } from '../competitions/competition.model';
import { PROGRAM_STATUS } from './program-status';
import type { ProgramStatus } from './program-status';
import type { SectionView } from './section-view';

// One row per competition, created on the first publish. A competition with
// no row has an unpublished (draft) program.
@Table({ tableName: 'program_publications' })
export class ProgramPublication extends Model<ProgramPublication> {
  @ForeignKey(() => Competition)
  @Column({ type: DataType.UUID, primaryKey: true })
  declare competitionId: string;

  @Column({
    type: DataType.ENUM(...Object.values(PROGRAM_STATUS)),
    allowNull: false,
    defaultValue: PROGRAM_STATUS.DRAFT,
  })
  declare status: ProgramStatus;

  @Column({ type: DataType.DATE, allowNull: true })
  declare publishedAt: Date | null;

  // The running order exactly as it was when the organizer published it, so
  // half-finished edits never reach the audience.
  @Column({ type: DataType.JSONB, allowNull: true })
  declare snapshot: SectionView[] | null;

  @BelongsTo(() => Competition)
  declare competition: Competition;
}
