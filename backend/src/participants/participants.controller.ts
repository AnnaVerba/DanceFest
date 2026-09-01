import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
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
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { SALT_ROUNDS } from '../auth/auth.constants';
import { CoachesService } from '../coaches/coaches.service';
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { Participant } from './participant.model';
import { ParticipantSummary } from './participant-summary.interface';
import { COACH_ID_REQUIRED_FOR_ORGANIZER_MESSAGE } from './participants.constants';

@ApiTags('participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/participants')
export class ParticipantsController {
  constructor(
    private readonly participantsService: ParticipantsService,
    private readonly coachesService: CoachesService,
  ) {}

  @ApiOperation({
    summary: "List coach's participants, or all participants for an organizer",
  })
  @ApiResponse({ status: 200, description: 'Participants returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @Roles(Role.COACH, Role.ORGANIZER)
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ParticipantSummary[]> {
    const participants =
      user.role === Role.ORGANIZER
        ? await this.participantsService.findAll()
        : await this.participantsService.findByCoachId(user.id);
    return participants.map((participant) => this.toSummary(participant));
  }

  @ApiOperation({
    summary:
      'Create a participant (coach: under themselves; organizer: under a coach they specify)',
  })
  @ApiResponse({ status: 201, description: 'Participant created.' })
  @ApiResponse({
    status: 400,
    description:
      'Validation failed for one or more fields, or (for an organizer) coachId is missing.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'This action is not available for your role.',
  })
  @ApiResponse({
    status: 404,
    description: 'No coach exists with the given coachId.',
  })
  @ApiResponse({
    status: 409,
    description: 'A participant with this email or phone already exists.',
  })
  @Roles(Role.COACH, Role.ORGANIZER)
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateParticipantDto,
  ): Promise<ParticipantSummary> {
    const coachId = await this.resolveCoachId(user, dto);
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const participant = await this.participantsService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      birthDate: dto.birthDate,
      coachId,
    });
    return this.toSummary(participant);
  }

  private async resolveCoachId(
    user: AuthenticatedUser,
    dto: CreateParticipantDto,
  ): Promise<string> {
    if (user.role === Role.COACH) {
      return user.id;
    }
    if (!dto.coachId) {
      throw new BadRequestException(COACH_ID_REQUIRED_FOR_ORGANIZER_MESSAGE);
    }
    await this.coachesService.findByIdOrFail(dto.coachId);
    return dto.coachId;
  }

  private toSummary(participant: Participant): ParticipantSummary {
    const plain = participant.get({ plain: true }) as ParticipantSummary & {
      passwordHash?: string;
    };
    delete plain.passwordHash;
    return plain;
  }
}
