import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { AwardsService } from './awards.service';
import { UpdateAllMedalLeaguesDto } from './dto/update-all-medal-leagues.dto';
import { UpdateAwardOverrideDto } from './dto/update-award-override.dto';
import { UpdateAwardSystemDto } from './dto/update-award-system.dto';

@ApiTags('awards')
@Controller('competitions/:competitionId/awards')
export class AwardsController {
  constructor(private readonly awardsService: AwardsService) {}

  @ApiOperation({
    summary: 'Medals, cups and diplomas to buy for the program as built',
  })
  @ApiResponse({ status: 200, description: 'Awards report returned.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiResponse({ status: 404, description: 'No such competition.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  report(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.awardsService.report(competitionId, user);
  }

  @ApiOperation({ summary: 'Switch the award system (медальний залік)' })
  @ApiResponse({ status: 200, description: 'Saved; recalculated report.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('system')
  setAwardSystem(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAwardSystemDto,
  ) {
    return this.awardsService.setAwardSystem(competitionId, user, dto);
  }

  @ApiOperation({
    summary:
      'Set «медаль кожному» leagues for this competition (the template is untouched)',
  })
  @ApiResponse({ status: 200, description: 'Saved; recalculated report.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('all-medal-leagues')
  setAllMedalLeagues(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAllMedalLeaguesDto,
  ) {
    return this.awardsService.setAllMedalLeagues(competitionId, user, dto);
  }

  @ApiOperation({ summary: 'Set or reset a hand-typed quantity for a line' })
  @ApiResponse({ status: 200, description: 'Saved; report with overrides.' })
  @ApiResponse({ status: 403, description: 'Not competition staff.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('overrides')
  setOverride(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateAwardOverrideDto,
  ) {
    return this.awardsService.setOverride(competitionId, user, dto);
  }
}
