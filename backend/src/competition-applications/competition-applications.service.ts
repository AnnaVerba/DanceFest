import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { ParticipantsService } from '../participants/participants.service';
import { CategoriesService } from '../categories/categories.service';
import { LEAGUE_CATEGORY_TYPE } from '../categories/category.model';
import { Role } from '../auth/roles.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompetitionApplication } from './competition-application.model';
import { ApplicationStatus } from './application-status.enum';
import { CreateCompetitionApplicationDto } from './dto/create-competition-application.dto';
import { UpdateApplicationLeagueDto } from './dto/update-application-league.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import {
  APPLICATION_NOT_FOUND_MESSAGE,
  APPLICATION_NOT_OWNED_MESSAGE,
  COMPETITION_NOT_FOUND_MESSAGE,
  LEAGUE_CATEGORY_TYPE_MISMATCH_MESSAGE,
  LEAGUE_CHANGE_NOT_ALLOWED_MESSAGE,
  NOT_OWN_PARTICIPANT_MESSAGE,
  PARTICIPANT_ID_REQUIRED_FOR_COACH_MESSAGE,
} from './competition-applications.constants';

@Injectable()
export class CompetitionApplicationsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionApplication)
    private readonly applicationModel: typeof CompetitionApplication,
    private readonly participantsService: ParticipantsService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async create(
    dto: CreateCompetitionApplicationDto,
    user: AuthenticatedUser,
  ): Promise<CompetitionApplication> {
    const competition = await this.competitionModel.findByPk(dto.competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    await this.assertLeagueCategory(dto.leagueId);

    const { participantId, coachId } = await this.resolveSubmitter(dto, user);

    return this.applicationModel.create({
      competitionId: dto.competitionId,
      leagueId: dto.leagueId,
      participantId,
      coachId,
      status: ApplicationStatus.PENDING,
    } as CreationAttributes<CompetitionApplication>);
  }

  findMine(user: AuthenticatedUser): Promise<CompetitionApplication[]> {
    if (user.role === Role.ORGANIZER) {
      return this.applicationModel.findAll({ order: [['createdAt', 'DESC']] });
    }
    const where =
      user.role === Role.PARTICIPANT
        ? { participantId: user.id }
        : { coachId: user.id };
    return this.applicationModel.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });
  }

  async findByIdOrFail(id: string): Promise<CompetitionApplication> {
    const application = await this.applicationModel.findByPk(id);
    if (!application) {
      throw new NotFoundException(APPLICATION_NOT_FOUND_MESSAGE);
    }
    return application;
  }

  async findByIdForUser(
    id: string,
    user: AuthenticatedUser,
  ): Promise<CompetitionApplication> {
    const application = await this.findByIdOrFail(id);
    this.assertAccess(application, user);
    return application;
  }

  async updateLeague(
    id: string,
    dto: UpdateApplicationLeagueDto,
    user: AuthenticatedUser,
  ): Promise<CompetitionApplication> {
    const application = await this.findByIdOrFail(id);
    this.assertAccess(application, user);
    if (application.status !== ApplicationStatus.PENDING) {
      throw new BadRequestException(LEAGUE_CHANGE_NOT_ALLOWED_MESSAGE);
    }
    await this.assertLeagueCategory(dto.leagueId);

    application.leagueId = dto.leagueId;
    await application.save();
    return application;
  }

  async updateStatus(
    id: string,
    dto: UpdateApplicationStatusDto,
  ): Promise<CompetitionApplication> {
    const application = await this.findByIdOrFail(id);
    application.status = dto.status;
    await application.save();
    return application;
  }

  // Ліга — категорія осі 'level', не окрема сутність, тож "активності" в неї
  // немає: перевіряємо лише, що ідентифікатор існує і належить саме цій осі.
  private async assertLeagueCategory(leagueId: string): Promise<void> {
    const category = await this.categoriesService.findByIdOrFail(leagueId);
    if (category.type !== LEAGUE_CATEGORY_TYPE) {
      throw new BadRequestException(LEAGUE_CATEGORY_TYPE_MISMATCH_MESSAGE);
    }
  }

  private async resolveSubmitter(
    dto: CreateCompetitionApplicationDto,
    user: AuthenticatedUser,
  ): Promise<{ participantId: string; coachId: string | null }> {
    if (user.role === Role.PARTICIPANT) {
      const participant = await this.participantsService.findByIdOrFail(
        user.id,
      );
      return { participantId: participant.id, coachId: participant.coachId };
    }

    if (!dto.participantId) {
      throw new BadRequestException(PARTICIPANT_ID_REQUIRED_FOR_COACH_MESSAGE);
    }
    const participant = await this.participantsService.findByIdOrFail(
      dto.participantId,
    );
    if (participant.coachId !== user.id) {
      throw new ForbiddenException(NOT_OWN_PARTICIPANT_MESSAGE);
    }
    return { participantId: participant.id, coachId: user.id };
  }

  private assertAccess(
    application: CompetitionApplication,
    user: AuthenticatedUser,
  ): void {
    if (user.role === Role.ORGANIZER) return;
    if (
      user.role === Role.PARTICIPANT &&
      application.participantId === user.id
    ) {
      return;
    }
    if (user.role === Role.COACH && application.coachId === user.id) {
      return;
    }
    throw new ForbiddenException(APPLICATION_NOT_OWNED_MESSAGE);
  }
}
