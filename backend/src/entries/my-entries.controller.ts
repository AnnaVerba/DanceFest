import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { EntriesService } from './entries.service';
import { UpdateEntryMusicDto } from './dto/update-entry-music.dto';

@ApiTags('entries')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/entries')
export class MyEntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @ApiOperation({
    summary: "The current user's own entries across all competitions",
    description:
      'Includes performances the user is a dancer in and, for a coach, ' +
      'performances any of their roster dancers is in.',
  })
  @ApiResponse({ status: 200, description: 'Entries returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.entriesService.listForUser(user);
  }

  @ApiOperation({ summary: 'Set or replace the track file name for an entry' })
  @ApiResponse({ status: 200, description: 'Entry updated.' })
  @ApiResponse({ status: 403, description: 'The entry is not yours.' })
  @ApiResponse({ status: 404, description: 'No such entry.' })
  @Patch(':id/music')
  updateMusic(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEntryMusicDto,
  ) {
    return this.entriesService.updateMusic(id, user, dto.musicName);
  }
}
