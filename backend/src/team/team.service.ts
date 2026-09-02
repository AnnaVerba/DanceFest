import { randomBytes } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ConfigService } from '@nestjs/config';
import { CreationAttributes, Op } from 'sequelize';
import { Admin } from '../admins/admin.model';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from './competition-admin.model';
import {
  Invitation,
  PENDING_INVITATION_STATUS,
  REVOKED_INVITATION_STATUS,
} from './invitation.model';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import {
  INVITATION_TTL_DAYS,
  MAX_INVITES_PER_HOUR,
  ONE_HOUR_MS,
  DEFAULT_FRONTEND_URL,
  VIEWER_ROLE_OWNER,
  VIEWER_ROLE_ADMIN,
  InvitationErrorCode,
  ALREADY_MEMBER_MESSAGE,
  ALREADY_INVITED_MESSAGE,
  INVITE_RATE_LIMITED_MESSAGE,
  INVITATION_NOT_FOUND_MESSAGE,
  INVITATION_NOT_ACTIVE_MESSAGE,
  OWNER_NOT_REMOVABLE_MESSAGE,
  ADMIN_NOT_FOUND_MESSAGE,
} from './team.constants';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
  COMPETITION_OWNER_ONLY_MESSAGE,
} from '../competitions/competitions.constants';

function randomToken(): string {
  return randomBytes(32).toString('hex');
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export type ViewerRole = 'owner' | 'admin';

@Injectable()
export class TeamService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Invitation)
    private readonly invitationModel: typeof Invitation,
    @InjectModel(Admin)
    private readonly adminModel: typeof Admin,
    private readonly config: ConfigService,
  ) {}

  async getTeam(competitionId: string, requesterId: string) {
    const competition = await this.loadCompetitionOrFail(competitionId);
    const viewerRole = await this.resolveViewerRole(competition, requesterId);

    const owner = await this.adminModel.findByPk(competition.ownerId);
    const memberships = await this.competitionAdminModel.findAll({
      where: { competitionId },
      include: [Admin],
      order: [['createdAt', 'ASC']],
    });
    const invitations = await this.invitationModel.findAll({
      where: { competitionId, status: PENDING_INVITATION_STATUS },
      order: [['createdAt', 'ASC']],
    });

    return {
      viewerRole,
      competition: {
        id: competition.id,
        name: competition.name,
        dateFrom: competition.dateFrom,
        dateTo: competition.dateTo,
      },
      organizer: owner && {
        id: owner.id,
        name: owner.name,
        email: owner.email,
      },
      admins: memberships.map((membership) => ({
        id: membership.admin.id,
        name: membership.admin.name,
        email: membership.admin.email,
        addedAt: membership.createdAt,
      })),
      invitations: invitations.map((invitation) =>
        this.toInvitationDto(invitation),
      ),
    };
  }

  async inviteAdmin(
    competitionId: string,
    requesterId: string,
    dto: CreateInvitationDto,
  ) {
    const competition = await this.loadCompetitionOrFail(competitionId);
    this.assertOwner(competition, requesterId);

    const email = dto.email.trim().toLowerCase();

    const owner = await this.adminModel.findByPk(competition.ownerId);
    const memberships = await this.competitionAdminModel.findAll({
      where: { competitionId },
      include: [Admin],
    });
    const alreadyMember =
      owner?.email.toLowerCase() === email ||
      memberships.some((m) => m.admin.email.toLowerCase() === email);
    if (alreadyMember) {
      throw new ConflictException({
        errorCode: InvitationErrorCode.ALREADY_MEMBER,
        message: ALREADY_MEMBER_MESSAGE,
      });
    }

    const pendingInvitations = await this.invitationModel.findAll({
      where: { competitionId, status: PENDING_INVITATION_STATUS },
    });
    if (pendingInvitations.some((inv) => inv.email.toLowerCase() === email)) {
      throw new ConflictException({
        errorCode: InvitationErrorCode.ALREADY_INVITED,
        message: ALREADY_INVITED_MESSAGE,
      });
    }

    const oneHourAgo = new Date(Date.now() - ONE_HOUR_MS);
    const recentCount = await this.invitationModel.count({
      where: { competitionId, createdAt: { [Op.gte]: oneHourAgo } },
    });
    if (recentCount >= MAX_INVITES_PER_HOUR) {
      throw new HttpException(
        {
          errorCode: InvitationErrorCode.RATE_LIMITED,
          message: INVITE_RATE_LIMITED_MESSAGE,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const invitation = await this.invitationModel.create({
      competitionId,
      email: dto.email.trim(),
      name: dto.name?.trim() || null,
      token: randomToken(),
      status: PENDING_INVITATION_STATUS,
      invitedByAdminId: requesterId,
      expiresAt: addDays(new Date(), INVITATION_TTL_DAYS),
    } as CreationAttributes<Invitation>);

    this.logInviteLink(invitation);

    return this.toInvitationDto(invitation);
  }

  async resendInvitation(
    competitionId: string,
    invitationId: string,
    requesterId: string,
  ) {
    const competition = await this.loadCompetitionOrFail(competitionId);
    this.assertOwner(competition, requesterId);

    const invitation = await this.invitationModel.findOne({
      where: { id: invitationId, competitionId },
    });
    if (!invitation) {
      throw new NotFoundException(INVITATION_NOT_FOUND_MESSAGE);
    }
    if (invitation.status !== PENDING_INVITATION_STATUS) {
      throw new ConflictException(INVITATION_NOT_ACTIVE_MESSAGE);
    }

    invitation.token = randomToken();
    invitation.expiresAt = addDays(new Date(), INVITATION_TTL_DAYS);
    await invitation.save();

    this.logInviteLink(invitation);

    return { expiresAt: invitation.expiresAt };
  }

  async revokeInvitation(
    competitionId: string,
    invitationId: string,
    requesterId: string,
  ): Promise<void> {
    const competition = await this.loadCompetitionOrFail(competitionId);
    this.assertOwner(competition, requesterId);

    const invitation = await this.invitationModel.findOne({
      where: { id: invitationId, competitionId },
    });
    if (!invitation) {
      throw new NotFoundException(INVITATION_NOT_FOUND_MESSAGE);
    }

    invitation.status = REVOKED_INVITATION_STATUS;
    await invitation.save();
  }

  async removeAdmin(
    competitionId: string,
    adminId: string,
    requesterId: string,
  ): Promise<void> {
    const competition = await this.loadCompetitionOrFail(competitionId);
    this.assertOwner(competition, requesterId);

    if (adminId === competition.ownerId) {
      throw new BadRequestException(OWNER_NOT_REMOVABLE_MESSAGE);
    }

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId },
    });
    if (!membership) {
      throw new NotFoundException(ADMIN_NOT_FOUND_MESSAGE);
    }

    await membership.destroy();
  }

  private async loadCompetitionOrFail(
    competitionId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    return competition;
  }

  private async resolveViewerRole(
    competition: Competition,
    adminId: string,
  ): Promise<ViewerRole> {
    if (competition.ownerId === adminId) return VIEWER_ROLE_OWNER;
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId: competition.id, adminId },
    });
    if (!membership) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
    return VIEWER_ROLE_ADMIN;
  }

  private assertOwner(competition: Competition, adminId: string): void {
    if (competition.ownerId !== adminId) {
      throw new ForbiddenException(COMPETITION_OWNER_ONLY_MESSAGE);
    }
  }

  private toInvitationDto(invitation: Invitation) {
    return {
      id: invitation.id,
      email: invitation.email,
      name: invitation.name ?? undefined,
      invitedAt: invitation.createdAt,
      expiresAt: invitation.expiresAt,
    };
  }

  private logInviteLink(invitation: Invitation): void {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? DEFAULT_FRONTEND_URL;
    console.log(
      `[invitations] ${invitation.email} → ${frontendUrl}/invite/${invitation.token} (діє до ${invitation.expiresAt.toISOString()})`,
    );
  }
}
