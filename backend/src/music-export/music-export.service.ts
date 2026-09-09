import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/sequelize';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { CreationAttributes } from 'sequelize';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompetitionsService } from '../competitions/competitions.service';
import { OcpS3ClientFactory } from '../uploads/ocp-s3-client.factory';
import {
  STORAGE_NOT_CONFIGURED_MESSAGE,
  OCP_BUCKET_ENV_KEY,
} from '../uploads/uploads.constants';
import { ExportJob } from './export-job.model';
import { CreateMusicExportDto } from './dto/create-music-export.dto';
import {
  MUSIC_EXPORT_QUEUE_NAME,
  BUILD_ARCHIVE_JOB_NAME,
  EXPORT_JOB_NOT_FOUND_MESSAGE,
} from './music-export.constants';

export interface JobStatusResult {
  status: ExportJob['status'];
  progress: number;
  fileUrl?: string;
  missing: ExportJob['missing'];
}

@Injectable()
export class MusicExportService {
  constructor(
    @InjectModel(ExportJob) private readonly exportJobModel: typeof ExportJob,
    @InjectQueue(MUSIC_EXPORT_QUEUE_NAME) private readonly queue: Queue,
    private readonly competitionsService: CompetitionsService,
    private readonly s3: OcpS3ClientFactory,
    private readonly config: ConfigService,
  ) {}

  async queueExport(
    competitionId: string,
    dto: CreateMusicExportDto,
    user: AuthenticatedUser,
  ): Promise<{ jobId: string }> {
    await this.competitionsService.loadAndAssertCanEdit(
      competitionId,
      user.id,
      user.accessLevel,
    );

    const job = await this.exportJobModel.create({
      competitionId,
      venueId: dto.venueId ?? null,
      requestedByUserId: user.id,
    } as CreationAttributes<ExportJob>);

    await this.queue.add(BUILD_ARCHIVE_JOB_NAME, { exportJobId: job.id });

    return { jobId: job.id };
  }

  async getStatus(
    jobId: string,
    user: AuthenticatedUser,
  ): Promise<JobStatusResult> {
    const job = await this.exportJobModel.findByPk(jobId);
    if (!job) {
      throw new NotFoundException(EXPORT_JOB_NOT_FOUND_MESSAGE);
    }
    // Same "organizer/owner or admin" gate as queueExport — without it any
    // authenticated user who knows/guesses a jobId could poll another
    // competition's export and get a presigned link to its archive.
    await this.competitionsService.loadAndAssertCanEdit(
      job.competitionId,
      user.id,
      user.accessLevel,
    );

    let fileUrl: string | undefined;
    if (job.status === 'completed' && job.objectKey && this.notExpired(job)) {
      fileUrl = await this.presignArchiveUrl(job.objectKey);
    }

    return {
      status: job.status,
      progress: job.progress,
      fileUrl,
      missing: job.missing,
    };
  }

  private notExpired(job: ExportJob): boolean {
    return !job.expiresAt || job.expiresAt.getTime() > Date.now();
  }

  private async presignArchiveUrl(objectKey: string): Promise<string> {
    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    if (!bucket) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }
    const command = new GetObjectCommand({ Bucket: bucket, Key: objectKey });
    return getSignedUrl(this.s3.getClient(), command, { expiresIn: 3600 });
  }
}
