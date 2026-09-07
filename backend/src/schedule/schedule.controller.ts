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
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { ScheduleService } from './schedule.service';
import { AddRowDto } from './dto/add-row.dto';
import { BuildSectionDto } from './dto/build-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { UpdateRowDto } from './dto/update-row.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { MergeGroupsDto } from './dto/merge-groups.dto';
import { MoveExitDto } from './dto/move-exit.dto';
import { RecalculateScheduleDto } from './dto/recalculate-schedule.dto';
import { ReorderSectionDto } from './dto/reorder-section.dto';

@ApiTags('schedule')
@Controller('competitions/:competitionId')
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @ApiOperation({ summary: 'List competition days (created on first read)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('days')
  listDays(@Param('competitionId') competitionId: string) {
    return this.scheduleService.listDays(competitionId);
  }

  @ApiOperation({ summary: 'Delete a day (409 if it has sections)' })
  @ApiResponse({ status: 204, description: 'Day removed.' })
  @ApiResponse({ status: 409, description: 'The day still has sections.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('days/:dayId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteDay(
    @Param('competitionId') competitionId: string,
    @Param('dayId') dayId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.deleteDay(competitionId, dayId, user.id);
  }

  @ApiOperation({
    summary: 'List sections with server-computed times (paged by section)',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sections')
  listSections(
    @Param('competitionId') competitionId: string,
    @Query('dayId') dayId?: string,
    @Query('venueId') venueId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.scheduleService.listSectionsPage(
      competitionId,
      { dayId, venueId },
      page,
      pageSize,
    );
  }

  @ApiOperation({ summary: 'All sections of a day, id + name only' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sections/summary')
  sectionsSummary(
    @Param('competitionId') competitionId: string,
    @Query('dayId') dayId?: string,
    @Query('venueId') venueId?: string,
  ) {
    return this.scheduleService.sectionsSummary(competitionId, {
      dayId,
      venueId,
    });
  }

  @ApiOperation({ summary: 'Day-wide counters for the editor header' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('sections/stats')
  sectionsStats(
    @Param('competitionId') competitionId: string,
    @Query('dayId') dayId?: string,
    @Query('venueId') venueId?: string,
  ) {
    return this.scheduleService.sectionsStats(competitionId, {
      dayId,
      venueId,
    });
  }

  @ApiOperation({ summary: 'Build a section from unassigned exits' })
  @ApiResponse({ status: 201, description: 'Section built.' })
  @ApiResponse({
    status: 409,
    description: 'Some exits are already in a section.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sections')
  buildSection(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: BuildSectionDto,
  ) {
    return this.scheduleService.buildSection(competitionId, user.id, dto);
  }

  @ApiOperation({ summary: 'Reorder the positions inside a section' })
  @ApiResponse({
    status: 400,
    description: 'The id list does not match the section composition.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('sections/:sectionId/order')
  reorderSection(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderSectionDto,
  ) {
    return this.scheduleService.reorderSection(
      competitionId,
      user.id,
      sectionId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Rename a section or change its start time' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('sections/:sectionId')
  updateSection(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.scheduleService.updateSection(
      competitionId,
      user.id,
      sectionId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Delete a section, freeing its exits' })
  @ApiResponse({ status: 204, description: 'Section removed.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sections/:sectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  deleteSection(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.deleteSection(
      competitionId,
      user.id,
      sectionId,
    );
  }

  @ApiOperation({ summary: 'Move one exit to another section' })
  @ApiResponse({ status: 404, description: 'The exit is not in the schedule.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('schedule/move-exit')
  moveExit(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MoveExitDto,
  ) {
    return this.scheduleService.moveExit(competitionId, user.id, dto);
  }

  @ApiOperation({ summary: 'Merge nomination groups for display only' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sections/:sectionId/merge-groups')
  mergeGroups(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: MergeGroupsDto,
  ) {
    return this.scheduleService.mergeGroups(
      competitionId,
      user.id,
      sectionId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Split a merged nomination group back' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sections/:sectionId/merge-groups/:groupKey')
  unmergeGroup(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @Param('groupKey') groupKey: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.unmergeGroup(
      competitionId,
      user.id,
      sectionId,
      groupKey,
    );
  }

  @ApiOperation({ summary: 'Order the section rows of one day' })
  @ApiResponse({
    status: 400,
    description: 'The id list does not match the day composition.',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('schedule/reorder-sections')
  reorderSections(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderSectionsDto,
  ) {
    return this.scheduleService.reorderSections(competitionId, user.id, dto);
  }

  @ApiOperation({ summary: 'Insert a manual row (break, gala) into a section' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('sections/:sectionId/rows')
  addRow(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddRowDto,
  ) {
    return this.scheduleService.addRow(competitionId, user.id, sectionId, dto);
  }

  @ApiOperation({ summary: 'Edit a manual row (break, gala) label or length' })
  @ApiResponse({ status: 400, description: 'The row is not a break or gala.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('sections/:sectionId/rows/:itemId')
  updateRow(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRowDto,
  ) {
    return this.scheduleService.updateRow(
      competitionId,
      user.id,
      sectionId,
      itemId,
      dto,
    );
  }

  @ApiOperation({ summary: 'Remove a manual row from a section' })
  @ApiResponse({ status: 400, description: 'The row is not a break or gala.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('sections/:sectionId/rows/:itemId')
  deleteRow(
    @Param('competitionId') competitionId: string,
    @Param('sectionId') sectionId: string,
    @Param('itemId') itemId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.deleteRow(
      competitionId,
      user.id,
      sectionId,
      itemId,
    );
  }

  @ApiOperation({
    summary: 'Recalculate section times from current pauses and limits',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('schedule/recalculate')
  recalculate(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RecalculateScheduleDto,
  ) {
    return this.scheduleService.recalculate(competitionId, user.id, dto);
  }

  @ApiOperation({
    summary: 'Distinct leagues / age categories among unassigned exits',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('performances/unassigned/facets')
  unassignedFacets(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.unassignedFacets(competitionId, user.id);
  }

  @ApiOperation({ summary: 'All unassigned exit ids under the filter' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('performances/unassigned/ids')
  unassignedIds(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('league') league?: string,
    @Query('ageCategory') ageCategory?: string,
    @Query('nominationId') nominationId?: string,
  ) {
    return this.scheduleService.unassignedIds(competitionId, user.id, {
      league,
      ageCategory,
      nominationId,
    });
  }

  @ApiOperation({ summary: 'List exits not yet placed in any section (paged)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('performances/unassigned')
  listUnassigned(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('league') league?: string,
    @Query('ageCategory') ageCategory?: string,
    @Query('nominationId') nominationId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.scheduleService.listUnassigned(
      competitionId,
      user.id,
      { league, ageCategory, nominationId },
      page,
      pageSize,
    );
  }

  @ApiOperation({
    summary: 'Public program — service rows with times only (paged by section)',
  })
  @Get('program')
  publicProgram(
    @Param('competitionId') competitionId: string,
    @Query('dayId') dayId?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.scheduleService.publicProgram(competitionId, {
      dayId,
      page,
      pageSize,
    });
  }

  @ApiOperation({ summary: 'My exits in the program' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('program/mine')
  myProgram(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.myProgram(competitionId, user.id);
  }

  @ApiOperation({ summary: 'Extended program for the sound engineer' })
  @ApiResponse({ status: 403, description: 'Not on the competition team.' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('program/extended')
  extendedProgram(
    @Param('competitionId') competitionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.scheduleService.extendedProgram(competitionId, user.id);
  }
}
