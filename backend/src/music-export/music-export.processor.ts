import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { Op } from 'sequelize';
import { Upload } from '@aws-sdk/lib-storage';
import { PassThrough } from 'stream';
import { Entry } from '../entries/entry.model';
import { Nomination } from '../nominations/nomination.model';
import { Category } from '../categories/category.model';
import { User } from '../users/user.model';
import { Track } from '../tracks/track.model';
import { TRACK_MIME_EXTENSIONS } from '../tracks/tracks.constants';
import { OcpS3ClientFactory } from '../uploads/ocp-s3-client.factory';
import { OCP_BUCKET_ENV_KEY } from '../uploads/uploads.constants';
import { ExportJob, MissingTrack } from './export-job.model';
import { buildTrackFileName } from './build-track-filename';
import { LazyS3ObjectStream } from './lazy-s3-object-stream';
import {
  MUSIC_EXPORT_QUEUE_NAME,
  MUSIC_EXPORTS_KEY_PREFIX,
  ARCHIVE_AVAILABILITY_SECONDS,
} from './music-export.constants';

const STYLE_CATEGORY_TYPE = 'style';

interface ExportItem {
  entry: Entry;
  track: Track;
  fileName: string;
}

@Processor(MUSIC_EXPORT_QUEUE_NAME)
export class MusicExportProcessor extends WorkerHost {
  constructor(
    @InjectModel(ExportJob) private readonly exportJobModel: typeof ExportJob,
    @InjectModel(Entry) private readonly entryModel: typeof Entry,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    @InjectModel(Category) private readonly categoryModel: typeof Category,
    @InjectModel(User) private readonly userModel: typeof User,
    @InjectModel(Track) private readonly trackModel: typeof Track,
    private readonly s3: OcpS3ClientFactory,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async process(job: Job<{ exportJobId: string }>): Promise<void> {
    const exportJob = await this.exportJobModel.findByPk(job.data.exportJobId);
    if (!exportJob) return;

    try {
      exportJob.status = 'processing';
      await exportJob.save();

      const entries = await this.loadEntries(
        exportJob.competitionId,
        exportJob.venueId,
      );
      const tracksByEntryId = await this.loadTracks(entries.map((e) => e.id));
      const stylesByEntryId = await this.resolveStyles(entries);
      const soloNamesByEntryId = await this.resolveSoloNames(entries);

      const missing: MissingTrack[] = [];
      const items: ExportItem[] = [];
      for (const entry of entries) {
        // Never expected to have one — not "missing".
        if (entry.improv) continue;

        const track = tracksByEntryId.get(entry.id);
        if (!track) {
          missing.push({ number: entry.number, dancerName: entry.routineName });
          continue;
        }

        const soloParticipant = soloNamesByEntryId.get(entry.id) ?? null;
        const fileName = buildTrackFileName({
          entryNumber: entry.number,
          soloParticipant,
          routineName: entry.routineName,
          league: entry.league,
          style: stylesByEntryId.get(entry.id) ?? null,
          extension: TRACK_MIME_EXTENSIONS[track.mimeType] ?? 'mp3',
        });
        items.push({ entry, track, fileName });
      }

      const objectKey = await this.buildAndUploadArchive(
        exportJob,
        items,
        (progress) => {
          exportJob.progress = progress;
          void exportJob.save();
        },
      );

      exportJob.status = 'completed';
      exportJob.progress = 100;
      exportJob.objectKey = objectKey;
      exportJob.missing = missing;
      exportJob.expiresAt = new Date(
        Date.now() + ARCHIVE_AVAILABILITY_SECONDS * 1000,
      );
      await exportJob.save();
    } catch (err) {
      exportJob.status = 'failed';
      exportJob.errorMessage = err instanceof Error ? err.message : String(err);
      await exportJob.save();
      throw err;
    }
  }

  private async loadEntries(
    competitionId: string,
    venueId: string | null,
  ): Promise<Entry[]> {
    const entries = await this.entryModel.findAll({
      where: { competitionId },
      order: [['number', 'ASC']],
    });
    if (!venueId) return entries;

    const nominationIds = [
      ...new Set(
        entries
          .map((e) => e.nominationId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nominationsInVenue = await this.nominationModel.findAll({
      where: { id: { [Op.in]: nominationIds }, venueId },
    });
    const allowed = new Set(nominationsInVenue.map((n) => n.id));
    return entries.filter((e) => e.nominationId && allowed.has(e.nominationId));
  }

  private async loadTracks(entryIds: string[]): Promise<Map<string, Track>> {
    const tracks = await this.trackModel.findAll({
      where: { performanceId: { [Op.in]: entryIds } },
    });
    return new Map(tracks.map((t) => [t.performanceId, t]));
  }

  // Style is a Category (type='style') reached via the entry's nomination.
  private async resolveStyles(
    entries: Entry[],
  ): Promise<Map<string, string | null>> {
    const nominationIds = [
      ...new Set(
        entries
          .map((e) => e.nominationId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const nominations = await this.nominationModel.findAll({
      where: { id: { [Op.in]: nominationIds } },
    });
    const categoryIds = [...new Set(nominations.flatMap((n) => n.categoryIds))];
    const styleCategories = await this.categoryModel.findAll({
      where: { id: { [Op.in]: categoryIds }, type: STYLE_CATEGORY_TYPE },
    });
    const styleNameById = new Map(styleCategories.map((c) => [c.id, c.name]));
    const nominationById = new Map(nominations.map((n) => [n.id, n]));

    const result = new Map<string, string | null>();
    for (const entry of entries) {
      const nomination = entry.nominationId
        ? nominationById.get(entry.nominationId)
        : undefined;
      const styleId = nomination?.categoryIds.find((id) =>
        styleNameById.has(id),
      );
      result.set(
        entry.id,
        styleId ? (styleNameById.get(styleId) ?? null) : null,
      );
    }
    return result;
  }

  // Only for solo entries — filename order (FirstName_LastName) needs the
  // User record; entry.routineName (already "LastName FirstName") won't do.
  private async resolveSoloNames(
    entries: Entry[],
  ): Promise<Map<string, { firstName: string; lastName: string }>> {
    const soloEntries = entries.filter(
      (e) => (e.participantIds?.length ?? 0) <= 1 && e.participantId,
    );
    const participantIds = [
      ...new Set(soloEntries.map((e) => e.participantId as string)),
    ];
    const users = await this.userModel.findAll({
      where: { id: { [Op.in]: participantIds } },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    const result = new Map<string, { firstName: string; lastName: string }>();
    for (const entry of soloEntries) {
      const user = userById.get(entry.participantId as string);
      if (user) {
        result.set(entry.id, {
          firstName: user.firstName,
          lastName: user.lastName,
        });
      }
    }
    return result;
  }

  // Streams each track straight from OCP into the zip, and the zip straight
  // out to OCP — nothing is buffered whole in memory at any point.
  // archiver is ESM-only; dynamic import keeps this file loadable from the
  // CommonJS build (same reasoning as music-metadata in TracksService).
  private async buildAndUploadArchive(
    exportJob: ExportJob,
    items: ExportItem[],
    onProgress: (percent: number) => void,
  ): Promise<string> {
    const bucket = this.requireBucket();
    const objectKey = `${MUSIC_EXPORTS_KEY_PREFIX}/${exportJob.competitionId}/${exportJob.id}.zip`;

    const { ZipArchive } = await import('archiver');
    const archive = new ZipArchive({ zlib: { level: 9 } });
    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    const upload = new Upload({
      client: this.s3.getClient(),
      params: {
        Bucket: bucket,
        Key: objectKey,
        Body: passThrough,
        ContentType: 'application/zip',
      },
    });
    const uploadDone = upload.done();
    // Observe immediately so a rejection here doesn't crash the process as
    // an unhandled rejection before we get around to awaiting it below.
    uploadDone.catch(() => {});
    let archiveError: unknown;
    archive.on('error', (err) => {
      archiveError = err;
    });

    try {
      let processed = 0;
      for (const item of items) {
        const stream = new LazyS3ObjectStream(this.s3.getClient(), {
          bucket,
          key: item.track.objectKey,
        });
        archive.append(stream, { name: item.fileName });
        processed++;
        // Last 10% reserved for finalize()/upload flushing after the loop.
        onProgress(Math.round((processed / Math.max(items.length, 1)) * 90));
      }

      await archive.finalize();
      if (archiveError) throw archiveError;
      await uploadDone;
    } catch (err) {
      archive.abort();
      // Unblocks the multipart upload, which is waiting on more data from
      // passThrough.
      passThrough.destroy();
      await upload.abort().catch(() => {});
      throw err;
    }

    onProgress(100);
    return objectKey;
  }

  private requireBucket(): string {
    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    if (!bucket) {
      throw new Error('OCP_BUCKET is not configured');
    }
    return bucket;
  }
}
