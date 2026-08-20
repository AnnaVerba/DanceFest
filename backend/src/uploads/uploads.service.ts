import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

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
      throw new BadRequestException(
        'Сховище зображень не налаштовано. Зверніться до адміністратора застосунку.',
      );
    }

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
    return this.client;
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Непідтримуваний формат файлу. Дозволено: JPEG, PNG, WEBP, GIF.',
      );
    }

    const bucket = this.config.get<string>('AWS_S3_BUCKET');
    if (!bucket) {
      throw new BadRequestException(
        'Сховище зображень не налаштовано. Зверніться до адміністратора застосунку.',
      );
    }

    const extension = MIME_EXTENSIONS[file.mimetype];
    const key = `competition-banners/${randomUUID()}.${extension}`;

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
