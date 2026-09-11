import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { OveragesService } from './overages.service';

@ApiTags('overages')
@Controller('competitions/:competitionId/overages')
export class OveragesController {
  constructor(private readonly overagesService: OveragesService) {}

  @ApiOperation({
    summary: "List a competition's overages",
    description:
      'Organizer working list: entries whose measured performance ' +
      'duration exceeds their effective time limit, with any purchased ' +
      'extra time and fee already recorded for them.',
  })
  @ApiResponse({ status: 200, description: 'Overages returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.overagesService.list(
      competitionId,
      admin.id,
      admin.accessLevel,
    );
  }
}
