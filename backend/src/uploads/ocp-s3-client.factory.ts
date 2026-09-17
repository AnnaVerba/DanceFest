import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client } from '@aws-sdk/client-s3';
import { derivePublicEndpoint } from './derive-public-endpoint';
import {
  STORAGE_NOT_CONFIGURED_MESSAGE,
  OCP_REGION_ENV_KEY,
  OCP_ACCESS_KEY_ID_ENV_KEY,
  OCP_SECRET_ACCESS_KEY_ENV_KEY,
  OCP_BUCKET_ENV_KEY,
  OCP_PUBLIC_URL_ENV_KEY,
  OCP_ENDPOINT_ENV_KEY,
} from './uploads.constants';

// One shared S3Client for OneCloudPlanet's Object Storage, reused by
// UploadsService (images) and TracksService (audio) so the connection
// config lives in exactly one place.
@Injectable()
export class OcpS3ClientFactory {
  private client: S3Client | null = null;
  private presignClient: S3Client | null = null;

  constructor(private readonly config: ConfigService) {}

  // For the backend's own requests to storage (put/get/delete) — reaches
  // it over whatever network path the backend is on, e.g. the `minio`
  // Docker service name in local dev.
  getClient(): S3Client {
    if (!this.client) {
      this.client = this.buildClient(
        this.config.get<string>(OCP_ENDPOINT_ENV_KEY),
      );
    }
    return this.client;
  }

  // For signing URLs handed to the browser (e.g. music-export downloads).
  // In local dev the backend and the browser reach MinIO through
  // different hosts (`minio` vs `localhost`), so a URL signed with
  // getClient()'s endpoint is unreachable outside Docker. OCP_PUBLIC_URL
  // already carries the browser-facing host for that case; falls back to
  // the same endpoint as getClient() otherwise (a real OCP endpoint is
  // already publicly reachable).
  getPresignClient(): S3Client {
    if (!this.presignClient) {
      this.presignClient = this.buildClient(this.resolvePublicEndpoint());
    }
    return this.presignClient;
  }

  private resolvePublicEndpoint(): string | undefined {
    const bucket = this.config.get<string>(OCP_BUCKET_ENV_KEY);
    const publicUrl = this.config.get<string>(OCP_PUBLIC_URL_ENV_KEY);
    const publicEndpoint =
      bucket && publicUrl ? derivePublicEndpoint(publicUrl, bucket) : null;
    return publicEndpoint ?? this.config.get<string>(OCP_ENDPOINT_ENV_KEY);
  }

  private buildClient(endpoint?: string): S3Client {
    const region = this.config.get<string>(OCP_REGION_ENV_KEY);
    const accessKeyId = this.config.get<string>(OCP_ACCESS_KEY_ID_ENV_KEY);
    const secretAccessKey = this.config.get<string>(
      OCP_SECRET_ACCESS_KEY_ENV_KEY,
    );
    if (!region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException(STORAGE_NOT_CONFIGURED_MESSAGE);
    }

    return new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
    });
  }
}
