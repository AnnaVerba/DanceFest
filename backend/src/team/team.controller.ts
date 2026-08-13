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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthenticatedAdmin } from '../auth/current-user.decorator';
import { TeamService } from './team.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competitions/:competitionId')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Get('team')
  getTeam(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.teamService.getTeam(competitionId, admin.id);
  }

  @Post('invitations')
  inviteAdmin(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.teamService.inviteAdmin(competitionId, admin.id, dto);
  }

  @Post('invitations/:invitationId/resend')
  resendInvitation(
    @Param('competitionId') competitionId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.teamService.resendInvitation(
      competitionId,
      invitationId,
      admin.id,
    );
  }

  @Delete('invitations/:invitationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  revokeInvitation(
    @Param('competitionId') competitionId: string,
    @Param('invitationId') invitationId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.teamService.revokeInvitation(
      competitionId,
      invitationId,
      admin.id,
    );
  }

  @Delete('admins/:adminId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeAdmin(
    @Param('competitionId') competitionId: string,
    @Param('adminId') adminId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.teamService.removeAdmin(competitionId, adminId, admin.id);
  }
}
