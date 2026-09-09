import { Body, Controller, Param, Put, UseGuards } from '@nestjs/common';
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
import { CompetitionsService } from '../competitions/competitions.service';
import { UpdateMusicDeadlineDto } from './dto/update-music-deadline.dto';

// Named `contests` per the ticket's literal route — the underlying entity
// is Competition (this codebase's only "contest" concept).
@ApiTags('tracks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, MinLevelGuard)
@MinLevel(AccessLevel.ORGANIZER)
@Controller('contests/:id/music-deadline')
export class MusicDeadlineController {
  constructor(private readonly competitionsService: CompetitionsService) {}

  @ApiOperation({
    summary: "Set the date after which an entry's track can't be changed",
  })
  @ApiResponse({ status: 200, description: 'Deadline updated.' })
  @ApiResponse({ status: 403, description: 'Not the owner/team admin.' })
  @ApiResponse({ status: 404, description: 'No such competition.' })
  @Put()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateMusicDeadlineDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.competitionsService.updateMusicDeadline(
      id,
      dto.musicDeadline,
      user.id,
      user.accessLevel,
    );
  }
}
