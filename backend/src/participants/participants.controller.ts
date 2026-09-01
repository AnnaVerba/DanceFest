import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
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
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';

@ApiTags('participants')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

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
  findAll(@CurrentUser() user: AuthenticatedUser) {
    if (user.role === Role.ORGANIZER) {
      return this.participantsService.findAll();
    }
    return this.participantsService.findByCoachId(user.id);
  }

  @ApiOperation({ summary: 'Create a participant under the current coach' })
  @ApiResponse({ status: 201, description: 'Participant created.' })
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
    status: 409,
    description: 'A participant with this email or phone already exists.',
  })
  @Roles(Role.COACH)
  @Post()
  async create(
    @CurrentUser() coach: AuthenticatedUser,
    @Body() dto: CreateParticipantDto,
  ) {
    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    return this.participantsService.create({
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      email: dto.email,
      passwordHash,
      birthDate: dto.birthDate,
      coachId: coach.id,
    });
  }
}
