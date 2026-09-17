import {
  BelongsTo,
  Column,
  DataType,
  ForeignKey,
  Model,
  Table,
} from 'sequelize-typescript';
import { Entry } from '../entries/entry.model';
import { User } from '../users/user.model';

// One row per entry's uploaded audio file. Re-upload replaces the row in
// place (performanceId is unique) — see TracksService.
@Table({ tableName: 'tracks' })
export class Track extends Model<Track> {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
    primaryKey: true,
  })
  declare id: string;

  @ForeignKey(() => Entry)
  @Column({ type: DataType.UUID, allowNull: false, unique: true })
  declare performanceId: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare originalFileName: string;

  // Key of the object in OCP Object Storage (bucket comes from
  // OCP_BUCKET_ENV_KEY).
  @Column({ type: DataType.STRING, allowNull: false })
  declare objectKey: string;

  // Permanent public URL for the same object — computed once at upload time
  // (see TracksService.upload) the same way UploadsService does for banner
  // images, so playback never needs a signed/expiring URL.
  @Column({ type: DataType.STRING, allowNull: true })
  declare publicUrl: string | null;

  @Column({ type: DataType.STRING, allowNull: false })
  declare mimeType: string;

  // Rounded up to the whole second — see TracksService.
  @Column({ type: DataType.INTEGER, allowNull: false })
  declare durationSeconds: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  declare sizeBytes: number;

  @ForeignKey(() => User)
  @Column({ type: DataType.UUID, allowNull: false })
  declare uploadedByUserId: string;

  @BelongsTo(() => Entry)
  declare performance: Entry;

  @Column(DataType.DATE)
  declare createdAt: Date;
}
