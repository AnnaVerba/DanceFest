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
import { NominationsService } from './nominations.service';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { BulkCreateNominationsDto } from './dto/bulk-create-nominations.dto';

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
  listPublic(@Param('competitionId') competitionId: string) {
    return this.nominationsService.listPublic(competitionId);
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
    return this.nominationsService.create(competitionId, admin.id, dto);
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
    return this.nominationsService.bulkCreate(competitionId, admin.id, dto);
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
    );
  }
}
