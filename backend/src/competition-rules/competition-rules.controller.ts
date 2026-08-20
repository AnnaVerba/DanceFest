import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
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
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CompetitionRulesService } from './competition-rules.service';
import { DURATION_ROUNDS } from './duration-limit.model';
import type { DurationRound } from './duration-limit.model';
import { CreateDurationLimitDto } from './dto/create-duration-limit.dto';
import { CreateOverlimitTariffDto } from './dto/create-overlimit-tariff.dto';
import { UpdateCompetitionRuleDto } from './dto/update-competition-rule.dto';

@ApiTags('competition-rules')
@Controller('competitions/:competitionId')
export class CompetitionRulesController {
  constructor(
    private readonly competitionRulesService: CompetitionRulesService,
  ) {}

  @ApiOperation({ summary: "Get a competition's rules" })
  @ApiResponse({
    status: 200,
    description:
      'Rules returned. Every competition has one from the moment it is created, with defaults if the organizer never touched them.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get('rules')
  getRules(@Param('competitionId') competitionId: string) {
    return this.competitionRulesService.getRules(competitionId);
  }

  @ApiOperation({ summary: "Partially update a competition's rules" })
  @ApiResponse({ status: 200, description: 'Rules saved.' })
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
  @Patch('rules')
  updateRules(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpdateCompetitionRuleDto,
  ) {
    return this.competitionRulesService.updateRules(
      competitionId,
      admin.id,
      dto,
    );
  }

  @ApiOperation({ summary: 'List overrun tariffs for a competition' })
  @Get('overlimit-tariffs')
  listTariffs(@Param('competitionId') competitionId: string) {
    return this.competitionRulesService.listTariffs(competitionId);
  }

  @ApiOperation({ summary: 'Add an overrun tariff bracket' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('overlimit-tariffs')
  createTariff(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateOverlimitTariffDto,
  ) {
    return this.competitionRulesService.createTariff(
      competitionId,
      admin.id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove an overrun tariff bracket' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No tariff exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('overlimit-tariffs/:tariffId')
  removeTariff(
    @Param('competitionId') competitionId: string,
    @Param('tariffId') tariffId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.competitionRulesService.removeTariff(
      competitionId,
      tariffId,
      admin.id,
    );
  }

  @ApiOperation({ summary: 'List duration limits for a competition' })
  @Get('duration-limits')
  listDurationLimits(@Param('competitionId') competitionId: string) {
    return this.competitionRulesService.listDurationLimits(competitionId);
  }

  @ApiOperation({
    summary: 'Resolve the effective duration limit for a nomination and round',
    description:
      "Verification helper for BE-9's resolveLimit algorithm: exact nomination+round limit, else the most specific axis (category)+round limit, else the 180s default.",
  })
  @ApiResponse({ status: 200, description: 'Effective limit, in seconds.' })
  @Get('duration-limits/resolve')
  async resolveDurationLimit(
    @Param('competitionId') competitionId: string,
    @Query('nominationId') nominationId: string,
    @Query('round') round?: string,
  ) {
    if (!nominationId) {
      throw new BadRequestException('Вкажіть nominationId');
    }
    const resolvedRound: DurationRound = DURATION_ROUNDS.includes(
      round as DurationRound,
    )
      ? (round as DurationRound)
      : 'final';
    const seconds = await this.competitionRulesService.resolveLimit(
      nominationId,
      resolvedRound,
    );
    return { nominationId, round: resolvedRound, seconds };
  }

  @ApiOperation({ summary: 'Add a duration limit' })
  @ApiResponse({
    status: 400,
    description: 'Neither or both of nominationId and categoryId were set.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('duration-limits')
  createDurationLimit(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateDurationLimitDto,
  ) {
    return this.competitionRulesService.createDurationLimit(
      competitionId,
      admin.id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove a duration limit' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No duration limit exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('duration-limits/:limitId')
  removeDurationLimit(
    @Param('competitionId') competitionId: string,
    @Param('limitId') limitId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.competitionRulesService.removeDurationLimit(
      competitionId,
      limitId,
      admin.id,
    );
  }
}
