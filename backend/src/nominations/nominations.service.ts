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
import { BulkCreateNominationsDto } from './dto/bulk-create-nominations.dto';

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

  async listPublic(competitionId: string) {
    await this.assertCompetitionExists(competitionId);
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
      allowsImprovisation: dto.allowsImprovisation ?? false,
      categoryIds: dto.categoryIds ?? [],
    } as CreationAttributes<Nomination>);

    return this.toDto(nomination);
  }

  async bulkCreate(
    competitionId: string,
    requesterId: string,
    dto: BulkCreateNominationsDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const created = await this.nominationModel.bulkCreate(
      dto.nominations.map((n) => ({
        competitionId,
        name: n.name.trim(),
        price: n.price ?? null,
        allowsImprovisation: n.allowsImprovisation ?? false,
        categoryIds: n.categoryIds ?? [],
      })) as CreationAttributes<Nomination>[],
    );

    return created.map((n) => this.toDto(n));
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

  private async assertCompetitionExists(
    competitionId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    return competition;
  }

  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.assertCompetitionExists(competitionId);
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
      allowsImprovisation: nomination.allowsImprovisation,
      categoryIds: nomination.categoryIds,
      createdAt: nomination.createdAt,
    };
  }
}
