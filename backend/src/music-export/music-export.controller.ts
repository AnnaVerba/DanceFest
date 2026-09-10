import {
  Body,
  Controller,
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
import { MinLevelGuard } from '../auth/min-level.guard';
import { MinLevel } from '../auth/min-level.decorator';
import { AccessLevel } from '../auth/access-level.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { MusicExportService } from './music-export.service';
import { CreateMusicExportDto } from './dto/create-music-export.dto';

// Named `contests` per the ticket's literal route — the underlying entity
// is Competition (this codebase's only "contest" concept).
@ApiTags('music-export')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, MinLevelGuard)
@MinLevel(AccessLevel.ORGANIZER)
@Controller('contests/:id/music/export')
export class MusicExportController {
  constructor(private readonly musicExportService: MusicExportService) {}

  @ApiOperation({
    summary:
      'Queue an async build of a .zip of all tracks, in performance order',
  })
  @ApiResponse({ status: 202, description: 'Export queued.' })
  @ApiResponse({ status: 403, description: 'Not the owner/team admin.' })
  @ApiResponse({ status: 404, description: 'No such competition.' })
  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  queue(
    @Param('id') id: string,
    @Body() dto: CreateMusicExportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.musicExportService.queueExport(id, dto, user);
  }
}
