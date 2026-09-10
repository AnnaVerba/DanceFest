import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { TracksService } from './tracks.service';
import { TRACK_FILE_MISSING_MESSAGE } from './tracks.constants';

// Named `entries` per the ticket's literal route — matches this codebase's
// `Entry` (one stage performance per nomination).
@ApiTags('tracks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entries/:id/music')
export class TracksController {
  constructor(private readonly tracksService: TracksService) {}

  @ApiOperation({ summary: "Upload (or replace) an entry's track" })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Track saved.' })
  @ApiResponse({
    status: 400,
    description: 'Missing file, or the entry is an improvisation.',
  })
  @ApiResponse({ status: 403, description: 'Not allowed, or MUSIC_LOCKED.' })
  @ApiResponse({ status: 404, description: 'No such entry.' })
  @ApiResponse({ status: 413, description: 'File too large (> 20 MB).' })
  @ApiResponse({ status: 415, description: 'Unsupported audio format.' })
  @ApiResponse({
    status: 422,
    description: "Duration couldn't be read from the file.",
  })
  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async upload(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException(TRACK_FILE_MISSING_MESSAGE);
    }
    return this.tracksService.upload(id, file, user);
  }

  @ApiOperation({ summary: 'Get a temporary playback URL for the track' })
  @ApiResponse({ status: 200, description: '15-minute presigned URL.' })
  @ApiResponse({ status: 404, description: 'No such entry, or no track.' })
  @Get()
  getPlaybackUrl(@Param('id') id: string) {
    return this.tracksService.getPlaybackUrl(id);
  }

  @ApiOperation({ summary: "Delete an entry's track" })
  @ApiResponse({ status: 204, description: 'Track removed.' })
  @ApiResponse({ status: 403, description: 'Not allowed, or MUSIC_LOCKED.' })
  @ApiResponse({ status: 404, description: 'No such entry or track.' })
  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<void> {
    await this.tracksService.remove(id, user);
  }
}
