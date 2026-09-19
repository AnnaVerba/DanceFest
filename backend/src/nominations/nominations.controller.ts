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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { NominationsService } from './nominations.service';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { BulkCreateNominationsDto } from './dto/bulk-create-nominations.dto';
import { BulkSetImprovisationDto } from './dto/bulk-set-improvisation.dto';
import { BulkAssignVenueDto } from './dto/bulk-assign-venue.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';

@ApiTags('nominations')
@Controller('competitions/:competitionId/nominations')
export class NominationsController {
  constructor(private readonly nominationsService: NominationsService) {}

  @ApiOperation({
    summary: "List a competition's nominations",
    description:
      'Public — the participant registration form needs this list without logging in.',
  })
  @ApiResponse({ status: 200, description: 'Nominations returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get()
  listPublic(
    @Param('competitionId') competitionId: string,
    @Query('q') q?: string,
  ) {
    return this.nominationsService.listPublic(competitionId, q);
  }

  @ApiOperation({
    summary: "A page of a competition's nominations, filtered",
    description:
      'The Номінації and Майданчики tabs page through this instead of loading every ' +
      'nomination. `categoryIds` is comma-separated; `venue` is a venue id or "none" for ' +
      'nominations without one. The filter matches the bulk actions exactly.',
  })
  @ApiResponse({ status: 200, description: '{ rows, total, page, pageSize }.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('paged')
  listPage(
    @Param('competitionId') competitionId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('categoryIds') categoryIds?: string,
    @Query('q') q?: string,
    @Query('venue') venue?: string,
  ) {
    return this.nominationsService.listPage(competitionId, {
      page,
      pageSize,
      categoryIds,
      q,
      venue,
    });
  }

  @ApiOperation({
    summary: 'Nomination counts per league (or age category) and venue',
    description:
      '`groupBy` is "level" (default) or "age". Each row: total nominations of that ' +
      'category and how many have no venue yet.',
  })
  @ApiResponse({ status: 200, description: 'Summary rows returned.' })
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
  @Get('venue-summary')
  venueSummary(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Query('groupBy') groupBy?: string,
  ) {
    return this.nominationsService.venueSummary(
      competitionId,
      admin.id,
      admin.accessLevel,
      groupBy,
    );
  }

  @ApiOperation({ summary: 'Add a nomination to a competition' })
  @ApiResponse({ status: 201, description: 'Nomination created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
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
  @Post()
  create(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateNominationDto,
  ) {
    return this.nominationsService.create(
      competitionId,
      admin.id,
      admin.accessLevel,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Add many nominations at once',
    description:
      'Used when a competition copies a whole set from a category template.',
  })
  @ApiResponse({ status: 201, description: 'Nominations created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, or the batch exceeds the size limit.',
  })
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
  @Post('bulk')
  bulkCreate(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: BulkCreateNominationsDto,
  ) {
    return this.nominationsService.bulkCreate(
      competitionId,
      admin.id,
      admin.accessLevel,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Set or clear the improvisation flag on many nominations at once',
    description:
      'Selects nominations either by an explicit id list or by a filter (category ids / name ' +
      'substring) — a filter is how hundreds of improvisation nominations get updated in one call.',
  })
  @ApiResponse({ status: 200, description: 'Nominations updated.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, neither or both of ids/filter were given, some listed ids do not ' +
      'belong to this competition, or nothing matched.',
  })
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
  @Patch('bulk-improvisation')
  bulkSetImprovisation(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: BulkSetImprovisationDto,
  ) {
    return this.nominationsService.bulkSetImprovisation(
      competitionId,
      admin.id,
      admin.accessLevel,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Put many nominations on a venue at once (or take them off)',
    description:
      'Selects nominations either by an explicit id list or by a filter (category ids / name ' +
      'substring / current venue). A null venueId takes the matched nominations off their venue.',
  })
  @ApiResponse({ status: 200, description: 'Nominations updated.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, neither or both of ids/filter were given, some listed ids do not ' +
      'belong to this competition, the venue is not in this competition, or nothing matched.',
  })
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
  @Patch('bulk-venue')
  bulkAssignVenue(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: BulkAssignVenueDto,
  ) {
    return this.nominationsService.bulkAssignVenue(
      competitionId,
      admin.id,
      admin.accessLevel,
      dto,
    );
  }

  @ApiOperation({
    summary: 'Update a nomination',
    description:
      'Partial. Used mostly to correct the price or the duration limits after the set was copied from a template.',
  })
  @ApiResponse({ status: 200, description: 'Nomination updated.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, or a duration limit points at a category the nomination does not have.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or nomination not found.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':nominationId')
  update(
    @Param('competitionId') competitionId: string,
    @Param('nominationId') nominationId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpdateNominationDto,
  ) {
    return this.nominationsService.update(
      competitionId,
      nominationId,
      admin.id,
      admin.accessLevel,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove a nomination from a competition' })
  @ApiResponse({ status: 204, description: 'Nomination removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or nomination not found.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':nominationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('competitionId') competitionId: string,
    @Param('nominationId') nominationId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.nominationsService.remove(
      competitionId,
      nominationId,
      admin.id,
      admin.accessLevel,
    );
  }
}
