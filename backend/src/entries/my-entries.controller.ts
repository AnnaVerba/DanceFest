import { Controller, Get, Query, UseGuards } from '@nestjs/common';
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
import { MyEntriesQueryDto } from './dto/my-entries-query.dto';

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
      'performances any of their roster dancers is in. One page, filtered ' +
      'and sorted, with the filter options and the totals of the blocks on it.',
  })
  @ApiResponse({ status: 200, description: 'Entries returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: MyEntriesQueryDto,
  ) {
    return this.entriesService.listForUser(user, query);
  }
}
