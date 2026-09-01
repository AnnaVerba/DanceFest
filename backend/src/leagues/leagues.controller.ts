import {
  Controller,
  Get,
  NotFoundException,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { LeaguesService } from './leagues.service';
import { LEAGUE_NOT_FOUND_MESSAGE } from './leagues.constants';

@ApiTags('leagues')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PARTICIPANT, Role.COACH, Role.ORGANIZER)
@Controller('leagues')
export class LeaguesController {
  constructor(private readonly leaguesService: LeaguesService) {}

  @ApiOperation({
    summary: 'List leagues (active only, unless organizer)',
  })
  @ApiResponse({ status: 200, description: 'Leagues returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === Role.ORGANIZER) {
      return this.leaguesService.findAll();
    }
    return this.leaguesService.findAllActive();
  }

  @ApiOperation({ summary: 'Get a league by id' })
  @ApiResponse({ status: 200, description: 'League returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({
    status: 404,
    description: 'No league exists with the given id.',
  })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const league = await this.leaguesService.findByIdOrFail(id);
    if (user.role !== Role.ORGANIZER && !league.isActive) {
      throw new NotFoundException(LEAGUE_NOT_FOUND_MESSAGE);
    }
    return league;
  }
}
