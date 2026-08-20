import {
  Body,
  Controller,
  Delete,
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
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';

@ApiTags('entries')
@Controller('competitions/:competitionId/entries')
export class EntriesController {
  constructor(private readonly entriesService: EntriesService) {}

  @ApiOperation({ summary: "List a competition's entries" })
  @ApiResponse({ status: 200, description: 'Entries returned.' })
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
    return this.entriesService.list(competitionId, admin.id);
  }

  @ApiOperation({
    summary: 'Submit an entry to a competition',
    description:
      'Public — used by the participant registration form, no login required. ' +
      'The nomination must be one already generated for this competition. ' +
      'Returns an array: a special category with a separate stage exit per program ' +
      'produces one entry per exit, each with its own running number.',
  })
  @ApiResponse({
    status: 201,
    description: 'Entry submitted. One element per stage exit.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, or the nomination does not exist for this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Post()
  create(
    @Param('competitionId') competitionId: string,
    @Body() dto: CreateEntryDto,
  ) {
    return this.entriesService.create(competitionId, dto);
  }

  @ApiOperation({ summary: 'Remove an entry from a competition' })
  @ApiResponse({ status: 204, description: 'Entry removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({ status: 404, description: 'Competition or entry not found.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':entryId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('competitionId') competitionId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.entriesService.remove(competitionId, entryId, admin.id);
  }
}
