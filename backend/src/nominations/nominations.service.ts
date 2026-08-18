import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Nomination } from './nomination.model';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';

@Injectable()
export class NominationsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
  ) {}

  // Публічний список — потрібен і формі подачі заявки, без авторизації.
  async list(competitionId: string) {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    const nominations = await this.nominationModel.findAll({
      where: { competitionId },
      order: [['createdAt', 'ASC']],
    });
    return nominations.map((n) => this.toDto(n));
  }

  async create(
    competitionId: string,
    requesterId: string,
    dto: CreateNominationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const nomination = await this.nominationModel.create({
      competitionId,
      name: dto.name.trim(),
      price: dto.price ?? null,
    } as CreationAttributes<Nomination>);

    return this.toDto(nomination);
  }

  async update(
    competitionId: string,
    nominationId: string,
    requesterId: string,
    dto: UpdateNominationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const nomination = await this.nominationModel.findOne({
      where: { id: nominationId, competitionId },
    });
    if (!nomination) {
      throw new NotFoundException('Номінацію не знайдено');
    }

    if ('venueId' in dto) {
      await nomination.update({ venueId: dto.venueId ?? null });
    }
    return this.toDto(nomination);
  }

  async remove(
    competitionId: string,
    nominationId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const nomination = await this.nominationModel.findOne({
      where: { id: nominationId, competitionId },
    });
    if (!nomination) {
      throw new NotFoundException('Номінацію не знайдено');
    }
    await nomination.destroy();
  }

  /** Керувати номінаціями може власник або будь-який адмін команди. */
  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    if (competition.ownerId === requesterId) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('Немає доступу до цього конкурсу');
    }
    return competition;
  }

  private toDto(nomination: Nomination) {
    return {
      id: nomination.id,
      name: nomination.name,
      price: nomination.price === null ? null : Number(nomination.price),
      venueId: nomination.venueId,
      createdAt: nomination.createdAt,
    };
  }
}
