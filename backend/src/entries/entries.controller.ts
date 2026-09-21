import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/public.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { EntriesService } from './entries.service';
import { CreateEntryDto } from './dto/create-entry.dto';
import { BulkCreateEntriesDto } from './dto/bulk-create-entries.dto';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { UpdateEntryExtraTimeDto } from './dto/update-entry-extra-time.dto';
import { QuoteEntriesDto } from './dto/quote-entries.dto';

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
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.entriesService.list(
      competitionId,
      admin.id,
      admin.accessLevel,
      page,
      pageSize,
    );
  }

  @ApiOperation({
    summary: "Public — list a competition's entries (read-only)",
    description:
      'No login required. Returns a limited, view-only field set — no ' +
      'payment method, choreographer, studio, city, or the music file — so ' +
      'anyone can browse who has applied without exposing organizer-only ' +
      'or personal data.',
  })
  @ApiResponse({ status: 200, description: 'Entries returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Public()
  @Get('public')
  listPublic(
    @Param('competitionId') competitionId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.entriesService.listPublic(competitionId, page, pageSize);
  }

  @ApiOperation({
    summary: "Public — count a competition's entries",
    description:
      'No login required. Used by the public competition page to show how ' +
      'many entries have been submitted.',
  })
  @ApiResponse({ status: 200, description: 'Entry count returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Public()
  @Get('count')
  count(@Param('competitionId') competitionId: string) {
    return this.entriesService.count(competitionId);
  }

  @ApiOperation({
    summary: "Public — aggregate numbers about a competition's entries",
    description:
      'No login required. Counts only — no names, studios or cities are listed.',
  })
  @ApiResponse({ status: 200, description: 'Stats returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Public()
  @Get('stats')
  stats(@Param('competitionId') competitionId: string) {
    return this.entriesService.stats(competitionId);
  }

  @ApiOperation({
    summary: 'Submit an entry to a competition',
    description:
      'Requires a logged-in account. ' +
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
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateEntryDto,
  ) {
    return this.entriesService.create(competitionId, dto, user);
  }

  @ApiOperation({
    summary: 'Submit several nominations in one application',
    description:
      'One transaction with one running-number sequence: if any nomination ' +
      'fails, the whole submission rolls back. Returns one element per stage exit.',
  })
  @ApiResponse({
    status: 201,
    description: 'Submission accepted. One element per stage exit.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, or a nomination does not exist for this competition.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('bulk')
  createMany(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BulkCreateEntriesDto,
  ) {
    return this.entriesService.createMany(competitionId, dto.entries, user);
  }

  @ApiOperation({
    summary: 'Price nominations for dancers before submitting',
    description:
      'Applies the pay-once rule for special nominations sharing a name, ' +
      "counting the dancers' existing entries in this competition.",
  })
  @ApiResponse({
    status: 201,
    description: 'Amounts per requested nomination.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, or a nomination is not in this competition.',
  })
  @ApiResponse({ status: 403, description: 'A dancer is not yours.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('quote')
  quote(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: QuoteEntriesDto,
  ) {
    return this.entriesService.quote(competitionId, dto, user);
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
    return this.entriesService.remove(
      competitionId,
      entryId,
      admin.id,
      admin.accessLevel,
    );
  }

  @ApiOperation({ summary: 'One entry with its dancers (staff only)' })
  @ApiResponse({ status: 200, description: 'Entry returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({ status: 404, description: 'Competition or entry not found.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':entryId')
  findOne(
    @Param('competitionId') competitionId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.entriesService.findOneForStaff(competitionId, entryId, user);
  }

  @ApiOperation({
    summary: 'Edit an entry: dancers, nomination, routine name and details',
  })
  @ApiResponse({ status: 200, description: 'Entry updated.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or the nomination lacks this program.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({ status: 404, description: 'Competition or entry not found.' })
  @ApiResponse({
    status: 409,
    description: 'A dancer already performs in this nomination.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':entryId')
  update(
    @Param('competitionId') competitionId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateEntryDto,
  ) {
    return this.entriesService.update(competitionId, entryId, dto, user);
  }

  @ApiOperation({
    summary: 'Record purchased additional on-stage time for an entry',
    description:
      'Records the +30/+60 sec purchased for a performance that ran over ' +
      'its limit, and the fee charged for it. Returns the updated entry ' +
      "and the entry's total amount due.",
  })
  @ApiResponse({ status: 200, description: 'Extra time recorded.' })
  @ApiResponse({ status: 400, description: 'Validation failed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({ status: 404, description: 'Competition or entry not found.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':entryId/extra-time')
  updateExtraTime(
    @Param('competitionId') competitionId: string,
    @Param('entryId') entryId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpdateEntryExtraTimeDto,
  ) {
    return this.entriesService.updateExtraTime(
      competitionId,
      entryId,
      admin.id,
      admin.accessLevel,
      dto,
    );
  }
}
