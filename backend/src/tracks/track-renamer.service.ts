import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Entry } from '../entries/entry.model';
import { OcpS3ClientFactory } from '../uploads/ocp-s3-client.factory';
import { buildContentDisposition } from '../uploads/content-disposition';
import {
  OCP_BUCKET_ENV_KEY,
  PUBLIC_READ_ACL,
} from '../uploads/uploads.constants';
import { Track } from './track.model';
import { TrackFileNameResolver } from './track-file-name-resolver.service';
import {
  buildCopySource,
  buildTrackObjectKey,
  buildTrackPublicUrl,
} from './track-object-keys';
import { TRACK_MIME_EXTENSIONS } from './tracks.constants';

const COPY_METADATA_DIRECTIVE = 'REPLACE';

// An entry's track is named after its number, name, league and style. When an
// edit changes any of them the stored file is copied under the new name, so
// the link and the download name match the entry again.
@Injectable()
export class TrackRenamer {
  private readonly logger = new Logger(TrackRenamer.name);

  constructor(
    @InjectModel(Track) private readonly trackModel: typeof Track,
    private readonly fileNameResolver: TrackFileNameResolver,
    private readonly s3: OcpS3ClientFactory,
    private readonly config: ConfigService,
  ) {}

  // Best effort: a failed copy leaves the old file, name and link in place —
  // together, so they never disagree.
  async renameToMatch(entry: Entry): Promise<void> {
    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    const track = await this.trackModel.findOne({
      where: { performanceId: entry.id },
    });
    const extension = track ? TRACK_MIME_EXTENSIONS[track.mimeType] : undefined;
    if (!bucket || !track || !extension) return;

    const fileName = await this.fileNameResolver.resolve(entry, extension);
    if (fileName === entry.musicName) return;

    const oldKey = track.objectKey;
    const newKey = buildTrackObjectKey(
      this.config,
      entry.competitionId,
      entry.id,
      fileName,
    );
    try {
      await this.s3.getClient().send(
        new CopyObjectCommand({
          Bucket: bucket,
          Key: newKey,
          CopySource: buildCopySource(bucket, oldKey),
          ContentType: track.mimeType,
          ContentDisposition: buildContentDisposition(fileName),
          MetadataDirective: COPY_METADATA_DIRECTIVE,
          ACL: PUBLIC_READ_ACL,
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Track of entry ${entry.id} not renamed: ${String(error)}`,
      );
      return;
    }

    const publicUrl = buildTrackPublicUrl(this.config, bucket, newKey);
    track.objectKey = newKey;
    track.publicUrl = publicUrl;
    await track.save();
    await entry.update({ musicName: fileName, musicUrl: publicUrl });
    await this.deleteQuietly(bucket, oldKey);
  }

  private async deleteQuietly(bucket: string, key: string): Promise<void> {
    try {
      await this.s3
        .getClient()
        .send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    } catch {
      // A stray old object is harmless: nothing references it any more.
    }
  }
}
