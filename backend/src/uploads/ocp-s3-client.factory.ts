import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import {
  STORAGE_NOT_CONFIGURED_MESSAGE,
  OCP_REGION_ENV_KEY,
  OCP_ACCESS_KEY_ID_ENV_KEY,
  OCP_SECRET_ACCESS_KEY_ENV_KEY,
  OCP_ENDPOINT_ENV_KEY,
} from './uploads.constants';

// One shared S3Client for OneCloudPlanet's Object Storage, reused by
// UploadsService (images) and TracksService (audio) so the connection
// config lives in exactly one place.
@Injectable()
export class OcpS3ClientFactory {
  private client: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  getClient(): S3Client {
    if (this.client) return this.client;

    const region = this.config.get<string>(OCP_REGION_ENV_KEY);
    const accessKeyId = this.config.get<string>(OCP_ACCESS_KEY_ID_ENV_KEY);
    const secretAccessKey = this.config.get<string>(
      OCP_SECRET_ACCESS_KEY_ENV_KEY,
    );
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }

    const endpoint = this.config.get<string>(OCP_ENDPOINT_ENV_KEY);
    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
    return this.client;
  }
}
