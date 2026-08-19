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
import { RegistrationsService } from './registrations.service';
import { CreateRegistrationDto } from './dto/create-registration.dto';
import { UpdateRegistrationStatusDto } from './dto/update-registration-status.dto';
import { UpdatePerformanceDto } from './dto/update-performance.dto';

@ApiTags('registrations')
@Controller('competitions/:competitionId/registrations')
export class RegistrationsController {
  constructor(private readonly registrationsService: RegistrationsService) {}

  @ApiOperation({
    summary: 'Submit a registration to a competition',
    description:
      'Public — used by the participant registration form, no login required.',
  })
  @ApiResponse({ status: 201, description: 'Registration submitted.' })
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
    @Body() dto: CreateRegistrationDto,
  ) {
    return this.registrationsService.create(competitionId, dto);
  }

  @ApiOperation({ summary: "List a competition's registrations" })
  @ApiResponse({ status: 200, description: 'Registrations returned.' })
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
    return this.registrationsService.list(competitionId, admin.id);
  }

  @ApiOperation({ summary: 'Update a registration status' })
  @ApiResponse({ status: 200, description: 'Status updated.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or registration not found.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':registrationId')
  updateStatus(
    @Param('competitionId') competitionId: string,
    @Param('registrationId') registrationId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpdateRegistrationStatusDto,
  ) {
    return this.registrationsService.updateStatus(
      competitionId,
      registrationId,
      admin.id,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove a registration from a competition' })
  @ApiResponse({ status: 204, description: 'Registration removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or registration not found.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete(':registrationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('competitionId') competitionId: string,
    @Param('registrationId') registrationId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.registrationsService.remove(
      competitionId,
      registrationId,
      admin.id,
    );
  }

  @ApiOperation({ summary: "Update one of a registration's performances" })
  @ApiResponse({ status: 200, description: 'Performance updated.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition, registration, or performance not found.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch(':registrationId/performances/:performanceId')
  updatePerformance(
    @Param('competitionId') competitionId: string,
    @Param('registrationId') registrationId: string,
    @Param('performanceId') performanceId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: UpdatePerformanceDto,
  ) {
    return this.registrationsService.updatePerformance(
      competitionId,
      registrationId,
      performanceId,
      admin.id,
      dto,
    );
  }
}
