import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op, UniqueConstraintError } from 'sequelize';
import { Category } from '../categories/category.model';
import type { CategoryType } from '../categories/category.model';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { CompetitionRule } from './competition-rule.model';
import { CreateDurationLimitDto } from './dto/create-duration-limit.dto';
import { CreateOverlimitTariffDto } from './dto/create-overlimit-tariff.dto';
import { UpdateCompetitionRuleDto } from './dto/update-competition-rule.dto';
import { DurationLimit } from './duration-limit.model';
import type { DurationRound } from './duration-limit.model';
import { OverlimitTariff } from './overlimit-tariff.model';

// Немає жодного налаштованого ліміту — 180 секунд і попередження в лог,
// а не помилка (BE-9, крок 3 розв'язання ліміту).
export const DEFAULT_DURATION_LIMIT_SECONDS = 180;

// Порядок осей від найспецифічнішої до найзагальнішої, коли ліміт заданий і
// на "рівень" (ліга), і на "вік" одночасно. Специфікація прямо каже лише
// "level пріоритетніша за age" — рештa осей додана за тим самим принципом
// (вужчі за складом, а не за розміром, йдуть першими), це припущення поза
// текстом задачі.
const AXIS_PRIORITY: CategoryType[] = [
  'level',
  'age',
  'direction',
  'discipline',
  'participants_count',
];

@Injectable()
export class CompetitionRulesService {
  private readonly logger = new Logger(CompetitionRulesService.name);

  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(CompetitionRule)
    private readonly competitionRuleModel: typeof CompetitionRule,
    @InjectModel(OverlimitTariff)
    private readonly overlimitTariffModel: typeof OverlimitTariff,
    @InjectModel(DurationLimit)
    private readonly durationLimitModel: typeof DurationLimit,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
  ) {}

  /**
   * Every competition has a rules row from the moment it's created (see
   * ensureDefaultsExist, wired into competition creation) — this only falls
   * back to on-the-fly creation for rows from before this feature existed.
   */
  async getRules(competitionId: string): Promise<CompetitionRule> {
    await this.assertCompetitionExists(competitionId);
    const [rules] = await this.competitionRuleModel.findOrCreate({
      where: { competitionId },
      defaults: { competitionId } as CreationAttributes<CompetitionRule>,
    });
    return rules;
  }

  async updateRules(
    competitionId: string,
    requesterId: string,
    dto: UpdateCompetitionRuleDto,
  ): Promise<CompetitionRule> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const rules = await this.getRules(competitionId);
    // A rule change never touches heats already built from the old values —
    // that's an explicit recalculation action, tracked separately (BE-13).
    return rules.update(dto);
  }

  async listTariffs(competitionId: string): Promise<OverlimitTariff[]> {
    await this.assertCompetitionExists(competitionId);
    return this.overlimitTariffModel.findAll({
      where: { competitionId },
      order: [['uptoSeconds', 'ASC']],
    });
  }

  async createTariff(
    competitionId: string,
    requesterId: string,
    dto: CreateOverlimitTariffDto,
  ): Promise<OverlimitTariff> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    try {
      return await this.overlimitTariffModel.create({
        competitionId,
        uptoSeconds: dto.uptoSeconds,
        price: dto.price,
      } as CreationAttributes<OverlimitTariff>);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          `Тариф для перелiмiту до ${dto.uptoSeconds}с уже існує`,
        );
      }
      throw error;
    }
  }

  async removeTariff(
    competitionId: string,
    tariffId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const tariff = await this.overlimitTariffModel.findOne({
      where: { id: tariffId, competitionId },
    });
    if (!tariff) {
      throw new NotFoundException('Тариф перелiмiту не знайдено');
    }
    await tariff.destroy();
  }

  async listDurationLimits(competitionId: string): Promise<DurationLimit[]> {
    await this.assertCompetitionExists(competitionId);
    return this.durationLimitModel.findAll({
      where: { competitionId },
      order: [['createdAt', 'ASC']],
    });
  }

  async createDurationLimit(
    competitionId: string,
    requesterId: string,
    dto: CreateDurationLimitDto,
  ): Promise<DurationLimit> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const hasNomination = Boolean(dto.nominationId);
    const hasCategory = Boolean(dto.categoryId);
    if (hasNomination === hasCategory) {
      throw new BadRequestException(
        'Задайте рівно одне: nominationId (точна номінація) або categoryId (вісь)',
      );
    }

    try {
      return await this.durationLimitModel.create({
        competitionId,
        nominationId: dto.nominationId ?? null,
        categoryId: dto.categoryId ?? null,
        round: dto.round ?? 'final',
        seconds: dto.seconds,
      } as CreationAttributes<DurationLimit>);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          hasNomination
            ? 'Ліміт для цієї номінації й раунду вже задано'
            : 'Ліміт для цієї осі й раунду вже задано',
        );
      }
      throw error;
    }
  }

  async removeDurationLimit(
    competitionId: string,
    limitId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const limit = await this.durationLimitModel.findOne({
      where: { id: limitId, competitionId },
    });
    if (!limit) {
      throw new NotFoundException('Ліміт тривалості не знайдено');
    }
    await limit.destroy();
  }

  /**
   * The time limit that applies to a stage appearance in this nomination and
   * round (BE-9's resolveLimit(performance), taken by nomination+round since
   * Performance doesn't exist on this branch yet):
   *   1. an exact nominationId+round limit wins outright;
   *   2. otherwise the most specific axis (categoryId+round) limit found
   *      among the nomination's own categories, ranked by AXIS_PRIORITY;
   *   3. otherwise DEFAULT_DURATION_LIMIT_SECONDS, logged as a fallback.
   */
  async resolveLimit(
    nominationId: string,
    round: DurationRound,
  ): Promise<number> {
    const nomination = await this.nominationModel.findByPk(nominationId);
    if (!nomination) {
      throw new NotFoundException('Номінацію не знайдено');
    }

    const exact = await this.durationLimitModel.findOne({
      where: { competitionId: nomination.competitionId, nominationId, round },
    });
    if (exact) return exact.seconds;

    if (nomination.categoryIds.length > 0) {
      const axisMatches = await this.durationLimitModel.findAll({
        where: {
          competitionId: nomination.competitionId,
          categoryId: { [Op.in]: nomination.categoryIds },
          round,
        },
        include: [{ model: Category }],
      });

      if (axisMatches.length > 0) {
        const ranked = [...axisMatches].sort(
          (a, b) =>
            AXIS_PRIORITY.indexOf(a.category!.type) -
            AXIS_PRIORITY.indexOf(b.category!.type),
        );
        return ranked[0].seconds;
      }
    }

    this.logger.warn(
      `No duration limit configured for nomination ${nominationId} (round: ${round}); falling back to ${DEFAULT_DURATION_LIMIT_SECONDS}s`,
    );
    return DEFAULT_DURATION_LIMIT_SECONDS;
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
}
