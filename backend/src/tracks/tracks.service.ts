import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  UnsupportedMediaTypeException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import type { CreationAttributes } from 'sequelize';
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Competition } from '../competitions/competition.model';
import { Entry } from '../entries/entry.model';
import { EntriesService } from '../entries/entries.service';
import { ENTRY_NOT_FOUND_MESSAGE } from '../entries/entries.constants';
import { COMPETITION_NOT_FOUND_MESSAGE } from '../competitions/competitions.constants';
import {
  CompetitionRulesService,
  DEFAULT_DURATION_LIMIT_SECONDS,
} from '../competition-rules/competition-rules.service';
import { DEFAULT_DURATION_ROUND } from '../competition-rules/duration-limit.model';
import { OcpS3ClientFactory } from '../uploads/ocp-s3-client.factory';
import { buildContentDisposition } from '../uploads/content-disposition';
import { buildPublicObjectUrl } from '../uploads/build-public-object-url';
import {
  STORAGE_NOT_CONFIGURED_MESSAGE,
  OCP_BUCKET_ENV_KEY,
  OCP_PUBLIC_URL_ENV_KEY,
  OCP_ENDPOINT_ENV_KEY,
} from '../uploads/uploads.constants';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { Track } from './track.model';
import { TrackFileNameResolver } from './track-file-name-resolver.service';
import {
  ALLOWED_TRACK_MIME_TYPES,
  TRACK_MIME_EXTENSIONS,
  MAX_TRACK_SIZE_BYTES,
  ENTRY_TRACKS_KEY_PREFIX,
  UNSUPPORTED_TRACK_FORMAT_MESSAGE,
  TRACK_TOO_LARGE_MESSAGE,
  DURATION_READ_FAILED_MESSAGE,
  IMPROV_TRACK_NOT_NEEDED_MESSAGE,
  TRACK_NOT_FOUND_MESSAGE,
  MUSIC_LOCKED_MESSAGE,
} from './tracks.constants';

export interface UploadTrackResult {
  musicUrl: string;
  fileName: string;
  durationSec: number;
  limitSec: number;
  overageSec: number;
}

@Injectable()
export class TracksService {
  constructor(
    @InjectModel(Entry) private readonly entryModel: typeof Entry,
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(Track) private readonly trackModel: typeof Track,
    private readonly entriesService: EntriesService,
    private readonly competitionRulesService: CompetitionRulesService,
    private readonly fileNameResolver: TrackFileNameResolver,
    private readonly s3: OcpS3ClientFactory,
    private readonly config: ConfigService,
  ) {}

  async upload(
    entryId: string,
    file: Express.Multer.File,
    user: AuthenticatedUser,
  ): Promise<UploadTrackResult> {
    const { entry, competition } = await this.loadContext(entryId);
    const isOrganizerAccess = await this.entriesService.assertCanManageTrack(
      entry,
      user,
    );
    this.assertNotImprov(entry);
    this.assertWithinMusicChangeWindow(competition, isOrganizerAccess);
    this.assertSupportedFormat(file);
    this.assertNotTooLarge(file);
    const durationSec = await this.readDurationSeconds(file);
    const limitSec = await this.resolveLimitSeconds(entry);

    const bucket = this.requireBucket();
    const extension = TRACK_MIME_EXTENSIONS[file.mimetype];
    // File naming: participantNumber_FirstName_LastName_League_Style.mp3 —
    // same format buildTrackFileName produces for the organizer's export
    // archive. Used as the object's actual stored name (not just a display
    // header) — the entryId folder already makes it unique, so a re-upload
    // just overwrites the same key.
    const displayFileName = await this.fileNameResolver.resolve(
      entry,
      extension,
    );
    const objectKey = `${ENTRY_TRACKS_KEY_PREFIX}_${competition.id}_${entryId}_${displayFileName}`;

    const existing = await this.trackModel.findOne({
      where: { performanceId: entryId },
    });

    await this.s3.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: objectKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: buildContentDisposition(displayFileName),
      }),
    );
    const publicUrl = this.buildPublicUrl(bucket, objectKey);
    const attrs = {
      originalFileName: file.originalname,
      objectKey,
      publicUrl,
      mimeType: file.mimetype,
      durationSeconds: durationSec,
      sizeBytes: file.buffer.length,
      uploadedByUserId: user.id,
    };
    await (existing
      ? this.applyUpdate(existing, attrs)
      : this.trackModel.create({
          performanceId: entryId,
          ...attrs,
        } as CreationAttributes<Track>));

    // Entry.musicName/musicUrl are the display copies the participant's own
    // entry list reads (EntriesService.toDto) — keep them in step with the
    // real track.
    entry.musicName = displayFileName;
    entry.musicUrl = publicUrl;
    await entry.save();

    // Only delete the old object if the new upload landed on a different
    // key — a same-named re-upload already overwrote it in place above.
    // Deferred until both DB writes commit, so a failure there doesn't
    // leave the DB pointing at an object we've already removed.
    if (existing && existing.objectKey !== objectKey) {
      await this.deleteObjectQuietly(bucket, existing.objectKey);
    }

    return {
      musicUrl: publicUrl,
      fileName: displayFileName,
      durationSec,
      limitSec,
      overageSec: Math.max(0, durationSec - limitSec),
    };
  }

  async getPlaybackUrl(entryId: string): Promise<{ musicUrl: string }> {
    const { entry } = await this.loadContext(entryId);
    const track = await this.trackModel.findOne({
      where: { performanceId: entry.id },
    });
    if (!track) {
      throw new NotFoundException(TRACK_NOT_FOUND_MESSAGE);
    }
    // publicUrl is set on every upload since this migration — the fallback
    // only covers a row written before it existed.
    return {
      musicUrl:
        track.publicUrl ??
        this.buildPublicUrl(this.requireBucket(), track.objectKey),
    };
  }

  async remove(entryId: string, user: AuthenticatedUser): Promise<void> {
    const { entry, competition } = await this.loadContext(entryId);
    const isOrganizerAccess = await this.entriesService.assertCanManageTrack(
      entry,
      user,
    );
    this.assertWithinMusicChangeWindow(competition, isOrganizerAccess);

    const track = await this.trackModel.findOne({
      where: { performanceId: entryId },
    });
    if (!track) {
      throw new NotFoundException(TRACK_NOT_FOUND_MESSAGE);
    }

    // Unlike upload's old-key cleanup, this delete must not be swallowed:
    // the track row is the only reference to this object, so if the delete
    // fails we need to keep the row (and objectKey) intact for a retry
    // rather than destroying the row and orphaning the object.
    await this.deleteObject(this.requireBucket(), track.objectKey);
    await track.destroy();

    entry.musicName = null;
    entry.musicUrl = null;
    await entry.save();
  }

  private async loadContext(
    entryId: string,
  ): Promise<{ entry: Entry; competition: Competition }> {
    const entry = await this.entryModel.findByPk(entryId);
    if (!entry) {
      throw new NotFoundException(ENTRY_NOT_FOUND_MESSAGE);
    }
    const competition = await this.competitionModel.findByPk(
      entry.competitionId,
    );
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    return { entry, competition };
  }

  private assertNotImprov(entry: Entry): void {
    if (entry.improv) {
      throw new BadRequestException(IMPROV_TRACK_NOT_NEEDED_MESSAGE);
    }
  }

  // "Changes" = upload/replace/remove; playback (GET) stays available past
  // the window so the track can still be played at the event. A submitter
  // or performer may only change music through registrationTo; the
  // competition's organizer/admin can do so at any time.
  private assertWithinMusicChangeWindow(
    competition: Competition,
    isOrganizerAccess: boolean,
  ): void {
    if (isOrganizerAccess) return;
    const today = new Date().toISOString().slice(0, 10);
    if (today > competition.registrationTo) {
      throw new ForbiddenException(MUSIC_LOCKED_MESSAGE);
    }
  }

  private assertSupportedFormat(file: Express.Multer.File): void {
    if (!ALLOWED_TRACK_MIME_TYPES.includes(file.mimetype)) {
      throw new UnsupportedMediaTypeException(UNSUPPORTED_TRACK_FORMAT_MESSAGE);
    }
  }

  private assertNotTooLarge(file: Express.Multer.File): void {
    if (file.buffer.length > MAX_TRACK_SIZE_BYTES) {
      throw new HttpException(
        TRACK_TOO_LARGE_MESSAGE,
        HttpStatus.PAYLOAD_TOO_LARGE,
      );
    }
  }

  // Server-measured duration, rounded UP to the whole second — the client
  // never supplies this. music-metadata is ESM-only; dynamic import keeps
  // this file loadable from the CommonJS build.
  private async readDurationSeconds(
    file: Express.Multer.File,
  ): Promise<number> {
    try {
      const { parseBuffer } = await import('music-metadata');
      const metadata = await parseBuffer(file.buffer, file.mimetype);
      const duration = metadata.format.duration;
      if (!duration || !Number.isFinite(duration)) {
        throw new Error('no duration in metadata');
      }
      return Math.ceil(duration);
    } catch {
      throw new UnprocessableEntityException(DURATION_READ_FAILED_MESSAGE);
    }
  }

  // No round concept on Entry yet — defaults to the "final" round, same as
  // CompetitionRulesService's own default.
  private async resolveLimitSeconds(entry: Entry): Promise<number> {
    if (!entry.nominationId) return DEFAULT_DURATION_LIMIT_SECONDS;
    return this.competitionRulesService.resolveLimit(
      entry.nominationId,
      DEFAULT_DURATION_ROUND,
    );
  }

  private requireBucket(): string {
    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    if (!bucket) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }
    return bucket;
  }

  private buildPublicUrl(bucket: string, objectKey: string): string {
    return buildPublicObjectUrl(
      objectKey,
      bucket,
      this.config.get<string>(OCP_PUBLIC_URL_ENV_KEY) ?? null,
      this.config.get<string>(OCP_ENDPOINT_ENV_KEY) ?? null,
    );
  }

  // Best-effort cleanup for the replaced object on upload — the new track
  // row already references the new object, so a failure here only leaves a
  // stray object behind, not a broken reference.
  private async deleteObjectQuietly(
    bucket: string,
    objectKey: string,
  ): Promise<void> {
    try {
      await this.deleteObject(bucket, objectKey);
    } catch {
      // Already gone (or never existed) — nothing to clean up.
    }
  }

  private async deleteObject(bucket: string, objectKey: string): Promise<void> {
    await this.s3
      .getClient()
      .send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
  }

  private async applyUpdate(
    track: Track,
    attrs: Pick<
      Track,
      | 'originalFileName'
      | 'objectKey'
      | 'publicUrl'
      | 'mimeType'
      | 'durationSeconds'
      | 'sizeBytes'
      | 'uploadedByUserId'
    >,
  ): Promise<Track> {
    Object.assign(track, attrs);
    await track.save();
    return track;
  }
}
