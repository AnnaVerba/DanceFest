import {
  BadRequestException,
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
import * as bcrypt from 'bcrypt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MinLevelGuard } from '../auth/min-level.guard';
import { MinLevel } from '../auth/min-level.decorator';
import { AccessLevel } from '../auth/access-level.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { SALT_ROUNDS } from '../auth/auth.constants';
import { UsersService } from './users.service';
import { CreateRosterParticipantDto } from './dto/create-roster-participant.dto';
import { UpgradeLevelDto } from './dto/upgrade-level.dto';
import { SetLevelDto } from './dto/set-level.dto';
import { SetMentorCoachDto } from './dto/set-mentor-coach.dto';
import { User } from './user.model';
import { ParticipantSummary } from './participant-summary.interface';
import { CoachSummary } from './coach-summary.interface';
import { OrganizerSummary } from './organizer-summary.interface';
import { MentorCoach } from './mentor-coach.interface';
import {
  COACH_ID_REQUIRED_FOR_ORGANIZER_MESSAGE,
  MENTOR_COACH_ONE_OF_MESSAGE,
} from './users.constants';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, MinLevelGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiOperation({ summary: "The current user's own profile" })
  @ApiResponse({ status: 200, description: 'Profile returned.' })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Get('me')
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getFullProfile(user.id);
  }

  @ApiOperation({
    summary:
      "List a coach's roster; for an organizer, search participants by name",
  })
  @ApiResponse({ status: 200, description: 'Participants returned.' })
  @MinLevel(AccessLevel.COACH)
  @Get('participants')
  async findRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q?: string,
  ): Promise<ParticipantSummary[]> {
    const participants =
      user.accessLevel === AccessLevel.COACH
        ? await this.usersService.listRosterByCoach(user.id, q)
        : await this.usersService.searchParticipants(q ?? '');
    return participants.map((participant) => this.toSummary(participant));
  }

  @ApiOperation({
    summary:
      'Add a dancer to the roster (coach: under themselves; organizer: under a coach)',
  })
  @ApiResponse({ status: 201, description: 'Participant created.' })
  @MinLevel(AccessLevel.COACH)
  @Post('participants')
  async createRoster(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRosterParticipantDto,
  ): Promise<ParticipantSummary> {
    const coachId = this.resolveCoachId(user, dto);
    const passwordHash = dto.password
      ? await bcrypt.hash(dto.password, SALT_ROUNDS)
      : null;
    const participant = await this.usersService.createRosterParticipant({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email ?? null,
      passwordHash,
      birthDate: dto.birthDate,
      coachId,
    });
    return this.toSummary(participant);
  }

  @ApiOperation({ summary: 'Raise your own access level (up to ORGANIZER)' })
  @ApiResponse({ status: 200, description: 'Level updated.' })
  @ApiResponse({
    status: 400,
    description: 'The level is not higher than your current one.',
  })
  @MinLevel(AccessLevel.PARTICIPANT)
  @Patch('me/level')
  async upgradeMe(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpgradeLevelDto,
  ): Promise<{ accessLevel: AccessLevel; schoolId: string | null }> {
    const updated = await this.usersService.selfUpgrade(
      user.id,
      dto.level,
      dto.schoolId,
    );
    return { accessLevel: updated.accessLevel, schoolId: updated.schoolId };
  }

  @ApiOperation({
    summary: 'Set your own mentor coach (pick one or name a new one)',
  })
  @ApiResponse({ status: 200, description: 'Mentor coach set.' })
  @MinLevel(AccessLevel.COACH)
  @Patch('me/coach')
  async setMyCoach(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SetMentorCoachDto,
  ): Promise<{ coachId: string }> {
    if (!dto.coachId === !dto.newCoach) {
      throw new BadRequestException(MENTOR_COACH_ONE_OF_MESSAGE);
    }
    const coachId = dto.coachId
      ? dto.coachId
      : (
          await this.usersService.createPlaceholderCoach({
            firstName: dto.newCoach!.firstName,
            lastName: dto.newCoach!.lastName,
            phone: dto.newCoach!.phone,
          })
        ).id;
    await this.usersService.setMentorCoach(user.id, coachId);
    return { coachId };
  }

  @ApiOperation({ summary: 'Your own mentor coach, with contact details' })
  @ApiResponse({ status: 200, description: 'Mentor coach or null.' })
  @MinLevel(AccessLevel.COACH)
  @Get('me/coach')
  getMyCoach(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<MentorCoach | null> {
    return this.usersService.getMentorCoach(user.id);
  }

  @ApiOperation({ summary: 'Coaches you can pick as your own mentor' })
  @ApiResponse({ status: 200, description: 'Coaches returned.' })
  @MinLevel(AccessLevel.COACH)
  @Get('coaches')
  async findSelectableCoaches(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<CoachSummary[]> {
    const coaches = await this.usersService.listSelectableCoaches();
    return coaches
      .filter((coach) => coach.id !== user.id)
      .map((coach) => ({
        id: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        schoolName: coach.school?.name ?? null,
      }));
  }

  @ApiOperation({ summary: 'Organizers a competition can be attributed to' })
  @ApiResponse({ status: 200, description: 'Organizers returned.' })
  @MinLevel(AccessLevel.ORGANIZER)
  @Get('organizers')
  async findSelectableOrganizers(): Promise<OrganizerSummary[]> {
    const organizers = await this.usersService.listSelectableOrganizers();
    return organizers.map((organizer) => ({
      id: organizer.id,
      firstName: organizer.firstName,
      lastName: organizer.lastName,
    }));
  }

  @ApiOperation({ summary: "Set another user's access level (admin only)" })
  @ApiResponse({ status: 200, description: 'Level updated.' })
  @MinLevel(AccessLevel.ADMIN)
  @Patch(':id/level')
  async setLevel(
    @Param('id') id: string,
    @Body() dto: SetLevelDto,
  ): Promise<{ id: string; accessLevel: AccessLevel }> {
    const updated = await this.usersService.setLevel(id, dto.level);
    return { id: updated.id, accessLevel: updated.accessLevel };
  }

  private resolveCoachId(
    user: AuthenticatedUser,
    dto: CreateRosterParticipantDto,
  ): string {
    if (user.accessLevel === AccessLevel.COACH) {
      return user.id;
    }
    if (!dto.coachId) {
      throw new BadRequestException(COACH_ID_REQUIRED_FOR_ORGANIZER_MESSAGE);
    }
    return dto.coachId;
  }

  private toSummary(participant: User): ParticipantSummary {
    return {
      id: participant.id,
      firstName: participant.firstName,
      lastName: participant.lastName,
      phone: participant.phone,
      email: participant.email,
      birthDate: participant.birthDate,
      hasPassword: Boolean(participant.passwordHash),
      coachId: participant.coachId,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
    };
  }
}
