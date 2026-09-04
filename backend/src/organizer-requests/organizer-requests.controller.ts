import {
  Body,
  Controller,
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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MinLevelGuard } from '../auth/min-level.guard';
import { MinLevel } from '../auth/min-level.decorator';
import { AccessLevel } from '../auth/access-level.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ApplicationStatus } from './application-status.enum';
import { OrganizerRequestsService } from './organizer-requests.service';
import { CreateOrganizerRequestDto } from './dto/create-organizer-request.dto';
import { ReviewOrganizerRequestDto } from './dto/review-organizer-request.dto';
import { ORGANIZER_REQUESTS_ROUTE } from './organizer-requests.constants';

@ApiTags(ORGANIZER_REQUESTS_ROUTE)
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, MinLevelGuard)
@Controller(ORGANIZER_REQUESTS_ROUTE)
export class OrganizerRequestsController {
  constructor(private readonly service: OrganizerRequestsService) {}

  @ApiOperation({ summary: 'Submit a request to become an organizer' })
  @ApiResponse({ status: 201, description: 'Request created.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizerRequestDto,
  ) {
    return this.service.create(dto, user);
  }

  @ApiOperation({ summary: 'Your own organizer requests' })
  @ApiResponse({ status: 200, description: 'Requests returned.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.service.findMine(user);
  }

  @ApiOperation({ summary: 'All organizer requests (admin)' })
  @ApiResponse({ status: 200, description: 'Requests returned.' })
  @MinLevel(AccessLevel.ADMIN)
  @Get()
  findAll(@Query('status') status?: ApplicationStatus) {
    return this.service.findAll(status);
  }

  @ApiOperation({ summary: 'Approve or reject a request (admin)' })
  @ApiResponse({ status: 200, description: 'Request reviewed.' })
  @MinLevel(AccessLevel.ADMIN)
  @Patch(':id')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewOrganizerRequestDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    return this.service.review(id, dto, admin);
  }

  @ApiOperation({ summary: 'Cancel your own pending request' })
  @ApiResponse({ status: 200, description: 'Request cancelled.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.cancelOwn(id, user);
  }
}
