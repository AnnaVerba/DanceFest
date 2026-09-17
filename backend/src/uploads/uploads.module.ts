import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';
import { OcpS3ClientFactory } from './ocp-s3-client.factory';

@Module({
  controllers: [UploadsController],
  providers: [UploadsService, OcpS3ClientFactory],
  exports: [OcpS3ClientFactory],
})
export class UploadsModule {}
