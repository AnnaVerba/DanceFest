import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import {
  ALLOWED_MIME_TYPES,
  MIME_EXTENSIONS,
  STORAGE_NOT_CONFIGURED_MESSAGE,
  UNSUPPORTED_FILE_FORMAT_MESSAGE,
  COMPETITION_BANNERS_KEY_PREFIX,
} from './uploads.constants';

@Injectable()
export class UploadsService {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  private getClient(): S3Client {
    if (this.client) return this.client;

    const region = this.config.get<string>('AWS_REGION');
    const accessKeyId = this.config.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.config.get<string>('AWS_SECRET_ACCESS_KEY');
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    return this.client;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(UNSUPPORTED_FILE_FORMAT_MESSAGE);
    }

    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }

    const extension = MIME_EXTENSIONS[file.mimetype];
    const key = `${COMPETITION_BANNERS_KEY_PREFIX}/${randomUUID()}.${extension}`;

    await this.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    const publicBaseUrl = this.config.get<string>('AWS_S3_PUBLIC_URL');
    const region = this.config.get<string>('AWS_REGION');
    return publicBaseUrl
      ? `${publicBaseUrl.replace(/\/$/, '')}/${key}`
      : `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
