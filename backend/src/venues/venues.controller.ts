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
import { MinLevelGuard } from '../auth/min-level.guard';
import { MinLevel } from '../auth/min-level.decorator';
import { AccessLevel } from '../auth/access-level.enum';
import { VenuesService } from './venues.service';
import { CreateVenueDto } from './dto/create-venue.dto';

@ApiTags('venues')
@Controller('competitions/:competitionId/venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @ApiOperation({ summary: "List a competition's venues (public)" })
  @ApiResponse({ status: 200, description: 'Venues returned.' })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get()
  list(@Param('competitionId') competitionId: string) {
    return this.venuesService.list(competitionId);
  }

  @ApiOperation({ summary: 'Add a venue to a competition (organizer/admin)' })
  @ApiResponse({ status: 201, description: 'Venue created.' })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only organizers and admins can change venues.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, MinLevelGuard)
  @MinLevel(AccessLevel.ORGANIZER)
  @Post()
  create(
    @Param('competitionId') competitionId: string,
    @Body() dto: CreateVenueDto,
  ) {
    return this.venuesService.create(competitionId, dto);
  }

  @ApiOperation({
    summary: 'Remove a venue from a competition (organizer/admin)',
  })
  @ApiResponse({ status: 204, description: 'Venue removed.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only organizers and admins can change venues.',
  })
  @ApiResponse({ status: 404, description: 'Competition or venue not found.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, MinLevelGuard)
  @MinLevel(AccessLevel.ORGANIZER)
  @Delete(':venueId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('competitionId') competitionId: string,
    @Param('venueId') venueId: string,
  ) {
    return this.venuesService.remove(competitionId, venueId);
  }
}
