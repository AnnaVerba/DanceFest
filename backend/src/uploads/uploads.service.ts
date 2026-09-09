import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { FileUploadConfig } from './file-upload-config.interface';
import { OcpS3ClientFactory } from './ocp-s3-client.factory';
import { buildContentDisposition } from './content-disposition';
import { buildPublicObjectUrl } from './build-public-object-url';
import {
  STORAGE_NOT_CONFIGURED_MESSAGE,
  IMAGE_UPLOAD_CONFIG,
  OCP_REGION_ENV_KEY,
  OCP_BUCKET_ENV_KEY,
  OCP_PUBLIC_URL_ENV_KEY,
} from './uploads.constants';

@Injectable()
export class UploadsService {
  constructor(
    private readonly config: ConfigService,
    private readonly s3: OcpS3ClientFactory,
  ) {}

  async uploadImage(file: Express.Multer.File): Promise<string> {
    return this.upload(file, IMAGE_UPLOAD_CONFIG);
  }

  private async upload(
    file: Express.Multer.File,
    uploadConfig: FileUploadConfig,
  ): Promise<string> {
    if (!uploadConfig.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(uploadConfig.unsupportedFormatMessage);
    }

    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    if (!bucket) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }

    const extension = uploadConfig.mimeExtensions[file.mimetype];
    const key = `${uploadConfig.keyPrefix}/${randomUUID()}.${extension}`;

    await this.s3.getClient().send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: buildContentDisposition(file.originalname),
      }),
    );

    return buildPublicObjectUrl(
      key,
      bucket,
      this.config.get<string>(OCP_PUBLIC_URL_ENV_KEY) ?? null,
      this.config.get<string>(OCP_REGION_ENV_KEY) ?? null,
    );
  }
}
