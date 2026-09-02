import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompetitionApplicationsService } from './competition-applications.service';
import { CreateCompetitionApplicationDto } from './dto/create-competition-application.dto';
import { UpdateApplicationLeagueDto } from './dto/update-application-league.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';

@ApiTags('competition-applications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('competition-applications')
export class CompetitionApplicationsController {
  constructor(
    private readonly applicationsService: CompetitionApplicationsService,
  ) {}

  @ApiOperation({ summary: 'Submit a competition application' })
  @ApiResponse({ status: 201, description: 'Application created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed, or the given category is not a league.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition, league, or participant not found.',
  })
  @Roles(Role.PARTICIPANT, Role.COACH)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCompetitionApplicationDto,
  ) {
    return this.applicationsService.create(dto, user);
  }

  @ApiOperation({ summary: 'List applications visible to the current user' })
  @ApiResponse({ status: 200, description: 'Applications returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @Roles(Role.PARTICIPANT, Role.COACH, Role.ORGANIZER)
  @Get()
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.findMine(user);
  }

  @ApiOperation({ summary: 'Get an application by id' })
  @ApiResponse({ status: 200, description: 'Application returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({
    status: 404,
    description: 'No application exists with the given id.',
  })
  @Roles(Role.PARTICIPANT, Role.COACH, Role.ORGANIZER)
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.applicationsService.findByIdForUser(id, user);
  }

  @ApiOperation({ summary: 'Change the league on a pending application' })
  @ApiResponse({ status: 200, description: 'League updated.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed, the given category is not a league, or the application is not PENDING.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'You have no access to this application.',
  })
  @ApiResponse({ status: 404, description: 'Application or league not found.' })
  @Roles(Role.PARTICIPANT, Role.COACH, Role.ORGANIZER)
  @Patch(':id/league')
  updateLeague(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateApplicationLeagueDto,
  ) {
    return this.applicationsService.updateLeague(id, dto, user);
  }

  @ApiOperation({ summary: "Change an application's status" })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({
    status: 404,
    description: 'No application exists with the given id.',
  })
  @Roles(Role.ORGANIZER)
  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
  ) {
    return this.applicationsService.updateStatus(id, dto);
  }
}
