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
import { TeamService } from './team.service';
import { CreateInvitationDto } from './dto/create-invitation.dto';

@ApiTags('team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('competitions/:competitionId')
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @ApiOperation({
    summary: "Get a competition's team (owner, admins, pending invitations)",
  })
  @ApiResponse({ status: 200, description: 'Team data returned.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'The caller has no access to this competition.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @Get('team')
  getTeam(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
  ) {
    return this.teamService.getTeam(competitionId, admin.id);
  }

  @ApiOperation({ summary: 'Invite an admin to join the competition team' })
  @ApiResponse({
    status: 201,
    description: 'Invitation created and (in a real deployment) emailed.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed for one or more fields.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the competition owner can invite admins.',
  })
  @ApiResponse({
    status: 404,
    description: 'No competition exists with the given id.',
  })
  @ApiResponse({
    status: 409,
    description:
      'This person is already a team member or already has a pending invitation.',
  })
  @ApiResponse({
    status: 429,
    description:
      'Too many invitations sent for this competition in the last hour.',
  })
  @Post('invitations')
  inviteAdmin(
    @Param('competitionId') competitionId: string,
    @CurrentUser() admin: AuthenticatedAdmin,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.teamService.inviteAdmin(competitionId, admin.id, dto);
  }

  @ApiOperation({
    summary: 'Resend a pending invitation with a fresh token and expiry',
  })
  @ApiResponse({
    status: 201,
    description: 'Invitation resent; new expiry returned.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the competition owner can resend invitations.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or invitation not found.',
  })
  @ApiResponse({
    status: 409,
    description: 'This invitation is no longer pending.',
  })
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

  @ApiOperation({ summary: 'Revoke a pending invitation' })
  @ApiResponse({ status: 204, description: 'Invitation revoked.' })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the competition owner can revoke invitations.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or invitation not found.',
  })
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

  @ApiOperation({ summary: "Remove an admin from the competition's team" })
  @ApiResponse({ status: 204, description: 'Admin removed from the team.' })
  @ApiResponse({
    status: 400,
    description: 'The owner cannot be removed from their own competition.',
  })
  @ApiResponse({ status: 401, description: 'Missing or invalid access token.' })
  @ApiResponse({
    status: 403,
    description: 'Only the competition owner can remove admins.',
  })
  @ApiResponse({
    status: 404,
    description: 'Competition or admin membership not found.',
  })
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
