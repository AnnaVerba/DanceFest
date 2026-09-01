import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Category } from '../categories/category.model';
import { Nomination } from './nomination.model';
import { planNominationExits } from './nomination-exits';
import type { NominationExit, NominationProgram } from './nomination-exits';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
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
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
  ) {}

  async listPublic(competitionId: string) {
    await this.assertCompetitionExists(competitionId);
    const nominations = await this.nominationModel.findAll({
      where: { competitionId },
      order: [['createdAt', 'ASC']],
    });

    const categories = await this.loadCategories(nominations);
    return nominations.map((n) => this.toDto(n, categories));
  }

  async create(
    competitionId: string,
    requesterId: string,
    dto: CreateNominationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    this.assertLimitsBelongToNomination(dto);

    const nomination = await this.nominationModel.create(
      this.toAttributes(competitionId, dto),
    );

    return this.toDto(nomination, await this.loadCategories([nomination]));
  }

  async bulkCreate(
    competitionId: string,
    requesterId: string,
    dto: BulkCreateNominationsDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    dto.nominations.forEach((n) => this.assertLimitsBelongToNomination(n));

    const created = await this.nominationModel.bulkCreate(
      dto.nominations.map((n) => this.toAttributes(competitionId, n)),
    );

    const categories = await this.loadCategories(created);
    return created.map((n) => this.toDto(n, categories));
  }

  async update(
    competitionId: string,
    nominationId: string,
    requesterId: string,
    dto: UpdateNominationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const nomination = await this.loadNomination(competitionId, nominationId);

    this.assertLimitsBelongToNomination({
      categoryIds: dto.categoryIds ?? nomination.categoryIds,
      programLimits: dto.programLimits ?? nomination.programLimits,
    });

    if (dto.name !== undefined) nomination.name = dto.name.trim();
    if (dto.price !== undefined) nomination.price = dto.price ?? null;
    if (dto.allowsImprovisation !== undefined) {
      nomination.allowsImprovisation = dto.allowsImprovisation;
    }
    if (dto.categoryIds !== undefined) nomination.categoryIds = dto.categoryIds;
    if (dto.isSpecial !== undefined) nomination.isSpecial = dto.isSpecial;
    if (dto.exitMode !== undefined) nomination.exitMode = dto.exitMode;
    if (dto.durationLimitSeconds !== undefined) {
      nomination.durationLimitSeconds = dto.durationLimitSeconds ?? null;
    }
    if (dto.programLimits !== undefined) {
      nomination.programLimits = dto.programLimits;
    }

    await nomination.save();
    return this.toDto(nomination, await this.loadCategories([nomination]));
  }

  async remove(
    competitionId: string,
    nominationId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const nomination = await this.loadNomination(competitionId, nominationId);
    await nomination.destroy();
  }

  async resolveForEntry(
    competitionId: string,
    ref: { nominationId?: string; name?: string },
  ): Promise<{
    nomination: Nomination;
    exits: NominationExit[];
    ageCategory: string | null;
    league: string | null;
  }> {
    const nomination = ref.nominationId
      ? await this.loadNomination(competitionId, ref.nominationId)
      : await this.loadNominationByName(competitionId, ref.name ?? '');

    const categories = await this.loadCategories([nomination]);
    const byType = (type: string) =>
      this.categoriesFor(nomination, categories, type)[0]?.name ?? null;

    return {
      nomination,
      exits: this.exitsOf(nomination, categories),
      ageCategory: byType('age'),
      league: byType('level'),
    };
  }

  private toAttributes(
    competitionId: string,
    dto: CreateNominationDto,
  ): CreationAttributes<Nomination> {
    return {
      competitionId,
      name: dto.name.trim(),
      price: dto.price ?? null,
      allowsImprovisation: dto.allowsImprovisation ?? false,
      categoryIds: dto.categoryIds ?? [],
      isSpecial: dto.isSpecial ?? false,
      exitMode: dto.exitMode ?? 'single',
      durationLimitSeconds: dto.durationLimitSeconds ?? null,
      programLimits: dto.programLimits ?? {},
    } as CreationAttributes<Nomination>;
  }

  private assertLimitsBelongToNomination(input: {
    categoryIds?: string[];
    programLimits?: Record<string, number>;
  }): void {
    const limits = input.programLimits ?? {};
    const categoryIds = input.categoryIds ?? [];
    const stray = Object.keys(limits).filter((id) => !categoryIds.includes(id));
    if (stray.length > 0) {
      throw new BadRequestException(
        `Ліміти задані для категорій, яких немає в номінації: ${stray.join(', ')}`,
      );
    }
  }

  private async loadCategories(
    nominations: Nomination[],
  ): Promise<Map<string, Category>> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    if (ids.length === 0) return new Map();

    const categories = await this.categoryModel.findAll({
      where: { id: { [Op.in]: ids } },
    });
    return new Map(categories.map((c) => [c.id, c]));
  }

  private categoriesFor(
    nomination: Nomination,
    categories: Map<string, Category>,
    type: string,
  ): Category[] {
    return (nomination.categoryIds ?? [])
      .map((id) => categories.get(id))
      .filter((c): c is Category => c !== undefined && c.type === type);
  }

  private programsFor(
    nomination: Nomination,
    categories: Map<string, Category>,
  ): NominationProgram[] {
    return this.categoriesFor(nomination, categories, 'discipline').map(
      (c) => ({
        id: c.id,
        name: c.name,
      }),
    );
  }

  private exitsOf(
    nomination: Nomination,
    categories: Map<string, Category>,
  ): NominationExit[] {
    return planNominationExits({
      label: nomination.name,
      exitMode: nomination.exitMode,
      programs: this.programsFor(nomination, categories),
      durationLimitSeconds: nomination.durationLimitSeconds,
      programLimits: nomination.programLimits ?? {},
    });
  }

  private async loadNominationByName(
    competitionId: string,
    name: string,
  ): Promise<Nomination> {
    const nomination = await this.nominationModel.findOne({
      where: { competitionId, name },
    });
    if (!nomination) {
      throw new BadRequestException(
        'Цю номінацію не знайдено серед номінацій конкурсу',
      );
    }
    return nomination;
  }

  private async loadNomination(
    competitionId: string,
    nominationId: string,
  ): Promise<Nomination> {
    const nomination = await this.nominationModel.findOne({
      where: { id: nominationId, competitionId },
    });
    if (!nomination) {
      throw new NotFoundException('Номінацію не знайдено');
    }
    return nomination;
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

  private toDto(nomination: Nomination, categories: Map<string, Category>) {
    return {
      id: nomination.id,
      name: nomination.name,
      price: nomination.price === null ? null : Number(nomination.price),
      allowsImprovisation: nomination.allowsImprovisation,
      categoryIds: nomination.categoryIds,
      isSpecial: nomination.isSpecial,
      exitMode: nomination.exitMode,
      durationLimitSeconds: nomination.durationLimitSeconds,
      programLimits: nomination.programLimits ?? {},
      programs: this.programsFor(nomination, categories),
      exits: this.exitsOf(nomination, categories),
      createdAt: nomination.createdAt,
    };
  }
}
