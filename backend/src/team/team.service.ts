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
import { Invitation } from './invitation.model';
import { CreateInvitationDto } from './dto/create-invitation.dto';

const INVITATION_TTL_DAYS = 7;
const MAX_INVITES_PER_HOUR = 20;

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
      where: { competitionId, status: 'pending' },
      order: [['createdAt', 'ASC']],
    });

    return {
      viewerRole,
      competition: {
        id: competition.id,
        name: competition.name,
        date: competition.date,
        location: competition.location,
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
        errorCode: 'already-member',
        message: 'Ця людина вже має доступ до конкурсу',
      });
    }

    const pendingInvitations = await this.invitationModel.findAll({
      where: { competitionId, status: 'pending' },
    });
    if (pendingInvitations.some((inv) => inv.email.toLowerCase() === email)) {
      throw new ConflictException({
        errorCode: 'already-invited',
        message: 'Запрошення вже надіслано',
      });
    }

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await this.invitationModel.count({
      where: { competitionId, createdAt: { [Op.gte]: oneHourAgo } },
    });
    if (recentCount >= MAX_INVITES_PER_HOUR) {
      throw new HttpException(
        {
          errorCode: 'rate-limited',
          message: 'Забагато запрошень, спробуйте за годину',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const invitation = await this.invitationModel.create({
      competitionId,
      email: dto.email.trim(),
      name: dto.name?.trim() || null,
      token: randomToken(),
      status: 'pending',
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
      throw new NotFoundException('Запрошення не знайдено');
    }
    if (invitation.status !== 'pending') {
      throw new ConflictException('Це запрошення більше не активне');
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
      throw new NotFoundException('Запрошення не знайдено');
    }

    invitation.status = 'revoked';
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
      throw new BadRequestException(
        'Власника не можна видалити зі списку адміністраторів',
      );
    }

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId },
    });
    if (!membership) {
      throw new NotFoundException('Адміністратора не знайдено');
    }

    await membership.destroy();
  }

  private async loadCompetitionOrFail(
    competitionId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    return competition;
  }

  private async resolveViewerRole(
    competition: Competition,
    adminId: string,
  ): Promise<ViewerRole> {
    if (competition.ownerId === adminId) return 'owner';
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId: competition.id, adminId },
    });
    if (!membership) {
      throw new ForbiddenException('Немає доступу до цього конкурсу');
    }
    return 'admin';
  }

  private assertOwner(competition: Competition, adminId: string): void {
    if (competition.ownerId !== adminId) {
      throw new ForbiddenException(
        'Цю дію може виконати лише власник конкурсу',
      );
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

  /**
   * Заглушка реального надсилання email: логуємо посилання в консоль бекенду.
   * Коли з'явиться поштовий сервіс — саме тут підключити відправку листа.
   */
  private logInviteLink(invitation: Invitation): void {
    const frontendUrl =
      this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
    console.log(
      `[invitations] ${invitation.email} → ${frontendUrl}/invite/${invitation.token} (діє до ${invitation.expiresAt.toISOString()})`,
    );
  }
}
