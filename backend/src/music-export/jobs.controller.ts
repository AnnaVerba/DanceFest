import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { MusicExportService } from './music-export.service';

@ApiTags('music-export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('jobs/:jobId')
export class JobsController {
  constructor(private readonly musicExportService: MusicExportService) {}

  @ApiOperation({ summary: 'Poll an async music-export job' })
  @ApiResponse({
    status: 200,
    description: 'status, progress, fileUrl (once completed), missing tracks.',
  })
  @ApiResponse({ status: 403, description: 'Not the owner/team admin.' })
  @ApiResponse({ status: 404, description: 'No such job.' })
  @Get()
  getStatus(
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.musicExportService.getStatus(jobId, user);
  }

  @ApiOperation({ summary: 'Cancel a queued or running music-export job' })
  @ApiResponse({
    status: 200,
    description: 'The job status after the cancel (unchanged if already done).',
  })
  @ApiResponse({ status: 403, description: 'Not the owner/team admin.' })
  @ApiResponse({ status: 404, description: 'No such job.' })
  @Post('cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('jobId') jobId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.musicExportService.cancel(jobId, user);
  }
}
