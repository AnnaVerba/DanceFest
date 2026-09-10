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
import { User } from '../users/user.model';

export const EXPORT_JOB_STATUSES = [
  'queued',
  'processing',
  'completed',
  'failed',
] as const;
export type ExportJobStatus = (typeof EXPORT_JOB_STATUSES)[number];

export interface MissingTrack {
  number: number;
  dancerName: string;
}

// One row per POST /contests/:id/music/export call — the durable record
// GET /jobs/:jobId reads. MusicExportProcessor (a BullMQ worker) is what
// actually does the archive-building work and updates this row as it goes.
@Table({ tableName: 'export_jobs' })
export class ExportJob extends Model<ExportJob> {
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

  @Column({
    type: DataType.ENUM(...EXPORT_JOB_STATUSES),
    allowNull: false,
    defaultValue: 'queued',
  })
  declare status: ExportJobStatus;

  @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 0 })
  declare progress: number;

  // Key of the finished .zip in OCP Object Storage — null until completed.
  @Column({ type: DataType.STRING, allowNull: true })
  declare objectKey: string | null;

  @Column({ type: DataType.JSONB, allowNull: false, defaultValue: [] })
  declare missing: MissingTrack[];

  // Archive is available for 24h after completion — see MusicExportService.
  @Column({ type: DataType.DATE, allowNull: true })
  declare expiresAt: Date | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare errorMessage: string | null;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare requestedByUserId: string;

  @BelongsTo(() => Competition)
  declare competition: Competition;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
