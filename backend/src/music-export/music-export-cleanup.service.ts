import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Op } from 'sequelize';
import { DeleteObjectCommand } from '@aws-sdk/client-s3';
import { OcpS3ClientFactory } from '../uploads/ocp-s3-client.factory';
import { OCP_BUCKET_ENV_KEY } from '../uploads/uploads.constants';
import { ExportJob } from './export-job.model';

// The 24h `expiresAt` on ExportJob already stops fileUrl from being
// returned (see MusicExportService.getStatus) — this is what actually
// deletes the .zip from OCP once that window passes, so archives don't
// pile up in the bucket forever.
@Injectable()
export class MusicExportCleanupService {
  private readonly logger = new Logger(MusicExportCleanupService.name);

  constructor(
    @InjectModel(ExportJob) private readonly exportJobModel: typeof ExportJob,
    private readonly s3: OcpS3ClientFactory,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async removeExpiredArchives(): Promise<void> {
    const expired = await this.exportJobModel.findAll({
      where: {
        status: 'completed',
        objectKey: { [Op.ne]: null },
        expiresAt: { [Op.lt]: new Date() },
      },
    });
    if (expired.length === 0) return;

    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    if (!bucket) return;

    for (const job of expired) {
      try {
        await this.s3.getClient().send(
          new DeleteObjectCommand({
            Bucket: bucket,
            Key: job.objectKey as string,
          }),
        );
      } catch (err) {
        this.logger.warn(
          `Failed to delete expired archive ${job.objectKey}: ${err instanceof Error ? err.message : err}`,
        );
        continue; // leave objectKey set — retried next run
      }
      job.objectKey = null;
      await job.save();
    }
  }
}
