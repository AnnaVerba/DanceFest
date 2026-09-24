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
import { BulkSetAxisPricesDto } from './dto/bulk-set-axis-prices.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
import { joinListQuery } from './list-query';

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
    summary: "The axes used by a competition's nominations",
    description:
      'Public — the entry form builds its league / age / style pickers from this instead of ' +
      'downloading every nomination. One list per axis, each value with its numeric bounds; ' +
      'special nominations carry no axes and are listed separately.',
  })
  @ApiResponse({ status: 200, description: 'Axis values returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get('axes')
  listAxes(@Param('competitionId') competitionId: string) {
    return this.nominationsService.listAxes(competitionId);
  }

  @ApiOperation({
    summary: "A competition's special nominations an entry can be made in",
    description:
      'Public — what the entry form lists under «Спеціальні номінації». A special nomination ' +
      'carries no style, so only the league, the age and the line-up (when set) apply. `league` is a single ' +
      'category id the nomination must carry. `ageCategory` is the age category the applicant ' +
      'picked: a nomination passes when it carries that very category, or when it carries no ' +
      'age category at all. `ages` is the comma-separated age of every dancer, used instead of ' +
      '`ageCategory` while none is picked yet: a nomination passes when its age category fits ' +
      'them all. `participants` is the number of dancers: a nomination passes when its line-up ' +
      'fits that count, or when it has no line-up. Without filters every special nomination ' +
      'is returned, never truncated.',
  })
  @ApiResponse({ status: 200, description: 'Special nominations returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get('specials')
  listSpecials(
    @Param('competitionId') competitionId: string,
    @Query('league') league?: string,
    @Query('ageCategory') ageCategory?: string,
    @Query('ages') ages?: string | string[],
    @Query('participants') participants?: string,
  ) {
    return this.nominationsService.listSpecials(competitionId, {
      league,
      ageCategory,
      ages: joinListQuery(ages),
      participants,
    });
  }

  @ApiOperation({
    summary: 'Nominations a given entry can be made in',
    description:
      'Public — what the entry form lists once the dancers and their categories are picked. ' +
      '`league` and `ageCategory` are single category ids the nomination must carry. `styles` ' +
      'is comma-separated: any one of them matches. `participants` is the number of dancers: ' +
      'a nomination passes when its line-up fits that count, or when it has no line-up. `ages` is the comma-separated age of every ' +
      'dancer, used instead of `ageCategory` while more than one category still fits: a ' +
      'nomination passes when its age category fits them all, or when it has none. ' +
      'At least one filter is required.',
  })
  @ApiResponse({ status: 200, description: 'Matching nominations returned.' })
  @ApiResponse({ status: 400, description: 'No category filter was given.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get('for-entry')
  listForEntry(
    @Param('competitionId') competitionId: string,
    @Query('league') league?: string,
    @Query('ageCategory') ageCategory?: string,
    @Query('styles') styles?: string,
    @Query('participants') participants?: string,
    @Query('ages') ages?: string,
  ) {
    return this.nominationsService.listForEntry(competitionId, {
      league,
      ageCategory,
      styles,
      participants,
      ages,
    });
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
    summary: "Prices of the competition's lineup and league values",
    description:
      'One row per lineup/league value used by the nominations of this competition. ' +
      '`price` is what those nominations cost now, or null when they cost different ' +
      'amounts. Special nominations are left out — they are priced per shared name.',
  })
  @ApiResponse({ status: 200, description: 'Rows returned.' })
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
  @Get('axis-prices')
  axisPrices(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.nominationsService.axisPrices(
      competitionId,
      admin.id,
      admin.accessLevel,
    );
  }

  @ApiOperation({
    summary: 'Price the nominations of this competition by lineup and league',
    description:
      'Applies to this competition only — the template the nominations came from keeps ' +
      'its own prices. Lineup outranks league, so a duo in a league that also has a ' +
      'price costs what the duo costs. Values left out of the body are not touched.',
  })
  @ApiResponse({ status: 200, description: '{ updated }: how many prices changed.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, a value is not a lineup or league, two prices were given for ' +
      'one value, or no nomination of this competition uses it.',
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
  @Patch('bulk-price')
  bulkSetAxisPrices(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: BulkSetAxisPricesDto,
  ) {
    return this.nominationsService.bulkSetAxisPrices(
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
