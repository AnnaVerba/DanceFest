import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  CreationAttributes,
  Op,
  QueryTypes,
  UniqueConstraintError,
} from 'sequelize';
import {
  Category,
  LEAGUE_CATEGORY_TYPE,
  LINEUP_CATEGORY_TYPE,
} from '../categories/category.model';
import type { CategoryType } from '../categories/category.model';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { AccessLevel } from '../auth/access-level.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CompetitionRule } from './competition-rule.model';
import { CreateDurationLimitDto } from './dto/create-duration-limit.dto';
import { CreateOverlimitTariffDto } from './dto/create-overlimit-tariff.dto';
import { UpdateCompetitionRuleDto } from './dto/update-competition-rule.dto';
import { DurationLimit, DEFAULT_DURATION_ROUND } from './duration-limit.model';
import type { DurationRound } from './duration-limit.model';
import { OverlimitTariff } from './overlimit-tariff.model';
import { resolveNominationDurationSeconds } from './resolve-nomination-duration';
import { AUTOMATIC_NOMINATION_AXES_SQL } from './automatic-nomination-axes.sql';
import type { AutomaticNominationAxesRow } from './automatic-nomination-axes-row.interface';
import type { EntryLimitInput } from './entry-limit-input.interface';
import { LimitCache } from './limit-cache';
import type { ImprovisationRoundsInput } from './improvisation-rounds-input.interface';
import { COUNT_NOMINATION_STYLES_SQL } from './count-nomination-styles.sql';
import {
  TARIFF_NOT_FOUND_MESSAGE,
  DURATION_LIMIT_NOT_FOUND_MESSAGE,
  DURATION_LIMIT_TARGET_REQUIRED_MESSAGE,
  NOMINATION_LIMIT_ALREADY_SET_MESSAGE,
  AXIS_LIMIT_ALREADY_SET_MESSAGE,
  MIN_IMPROVISATION_ROUNDS,
} from './competition-rules.constants';
import { NOMINATION_NOT_FOUND_MESSAGE } from '../nominations/nominations.constants';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';

export const DEFAULT_DURATION_LIMIT_SECONDS = 180;

// Keep only "axis value name -> positive whole number of seconds" pairs; the
// DTO only guarantees the value is an object. Shared by leagueLimits
// (level axis) and lineupLimits (lineup axis) — both are the same shape.
function sanitizeLimits(raw: Record<string, unknown>): Record<string, number> {
  const clean: Record<string, number> = {};
  for (const [name, value] of Object.entries(raw)) {
    const seconds = Number(value);
    if (Number.isInteger(seconds) && seconds > 0) {
      clean[name.trim()] = seconds;
    }
  }
  return clean;
}

const AXIS_PRIORITY: CategoryType[] = [
  'level',
  'age',
  'direction',
  'style',
  'lineup',
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
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
  ) {}

  async getRules(competitionId: string): Promise<CompetitionRule> {
    await this.assertCompetitionExists(competitionId);
    const [rules] = await this.competitionRuleModel.findOrCreate({
      where: { competitionId },
      defaults: { competitionId } as CreationAttributes<CompetitionRule>,
    });
    return rules;
  }

  // Staff-only read for the HTTP layer; other services keep using getRules.
  async getRulesForStaff(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<CompetitionRule> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
    return this.getRules(competitionId);
  }

  async updateRules(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: UpdateCompetitionRuleDto,
  ): Promise<CompetitionRule> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
    const rules = await this.getRules(competitionId);
    if (dto.leagueLimits !== undefined) {
      dto.leagueLimits = sanitizeLimits(dto.leagueLimits);
    }
    if (dto.lineupLimits !== undefined) {
      dto.lineupLimits = sanitizeLimits(dto.lineupLimits);
    }
    const updated = await rules.update(dto);
    if (dto.leagueLimits !== undefined || dto.lineupLimits !== undefined) {
      await this.applyAxisDurationChanges(competitionId, updated);
    }
    return updated;
  }

  // League and lineup durations are knobs on CompetitionRule, but nominations
  // keep their own durationLimitSeconds (TASK-07) so the schedule/admin views
  // don't need to re-resolve it on every read. Changing a knob (BUG-10) must
  // therefore push the new value onto every nomination that follows the
  // rules — except ones an admin already set by hand (durationOverridden)
  // and improvisations.
  private async applyAxisDurationChanges(
    competitionId: string,
    rules: CompetitionRule,
  ): Promise<void> {
    const rows = await this.nominationModel.sequelize!.query<AutomaticNominationAxesRow>(
      AUTOMATIC_NOMINATION_AXES_SQL,
      { bind: [competitionId], type: QueryTypes.SELECT },
    );
    const idsBySeconds = new Map<number | null, string[]>();
    for (const row of rows) {
      const seconds = resolveNominationDurationSeconds(rules, row);
      const ids = idsBySeconds.get(seconds);
      if (ids) ids.push(row.id);
      else idsBySeconds.set(seconds, [row.id]);
    }
    for (const [seconds, ids] of idsBySeconds) {
      await this.nominationModel.update(
        { durationLimitSeconds: seconds },
        { where: { id: { [Op.in]: ids } } },
      );
    }
  }

  async listTariffs(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<OverlimitTariff[]> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
    return this.overlimitTariffModel.findAll({
      where: { competitionId },
      order: [['uptoSeconds', 'ASC']],
    });
  }

  async createTariff(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: CreateOverlimitTariffDto,
  ): Promise<OverlimitTariff> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
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
    requester: AuthenticatedUser,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
    const tariff = await this.overlimitTariffModel.findOne({
      where: { id: tariffId, competitionId },
    });
    if (!tariff) {
      throw new NotFoundException(TARIFF_NOT_FOUND_MESSAGE);
    }
    await tariff.destroy();
  }

  async listDurationLimits(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<DurationLimit[]> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
    return this.durationLimitModel.findAll({
      where: { competitionId },
      order: [['createdAt', 'ASC']],
    });
  }

  async createDurationLimit(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: CreateDurationLimitDto,
  ): Promise<DurationLimit> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);

    const hasNomination = Boolean(dto.nominationId);
    const hasCategory = Boolean(dto.categoryId);
    if (hasNomination === hasCategory) {
      throw new BadRequestException(DURATION_LIMIT_TARGET_REQUIRED_MESSAGE);
    }

    try {
      return await this.durationLimitModel.create({
        competitionId,
        nominationId: dto.nominationId ?? null,
        categoryId: dto.categoryId ?? null,
        round: dto.round ?? DEFAULT_DURATION_ROUND,
        seconds: dto.seconds,
      } as CreationAttributes<DurationLimit>);
    } catch (error) {
      if (error instanceof UniqueConstraintError) {
        throw new ConflictException(
          hasNomination
            ? NOMINATION_LIMIT_ALREADY_SET_MESSAGE
            : AXIS_LIMIT_ALREADY_SET_MESSAGE,
        );
      }
      throw error;
    }
  }

  async removeDurationLimit(
    competitionId: string,
    limitId: string,
    requester: AuthenticatedUser,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requester);
    const limit = await this.durationLimitModel.findOne({
      where: { id: limitId, competitionId },
    });
    if (!limit) {
      throw new NotFoundException(DURATION_LIMIT_NOT_FOUND_MESSAGE);
    }
    await limit.destroy();
  }

  async resolveLimit(
    nominationId: string,
    round: DurationRound,
  ): Promise<number> {
    const nomination = await this.nominationModel.findByPk(nominationId, {
      include: [{ model: Category, through: { attributes: [] } }],
    });
    if (!nomination) {
      throw new NotFoundException(NOMINATION_NOT_FOUND_MESSAGE);
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

  // Priority for an entry's effective on-stage time limit: the nomination's
  // duration set by hand (TASK-07) → lineup limit → league limit (the
  // simple per-lineup/per-league knobs on CompetitionRule, lineup winning
  // when both are set) → per-nomination/axis duration_limits →
  // DEFAULT_DURATION_LIMIT_SECONDS. `limitCache` lets a caller resolving
  // many entries in one pass — e.g. a whole competition's overage list —
  // skip repeat lookups for the same nomination.
  async resolveEffectiveLimit(
    entry: EntryLimitInput,
    rules: CompetitionRule,
    limitCache: LimitCache = new LimitCache(),
  ): Promise<number> {
    if (entry.nominationId) {
      const manual = await this.manualLimitOf(entry.nominationId, limitCache);
      if (manual !== null) return manual;
    }

    // lineupLimits outranks leagueLimits: a lineup value (Mega Crew, Дуо…)
    // set by the organizer wins over the league whatever it says. The keys
    // are the names of the nomination's own lineup categories.
    const lineupNames = entry.nominationId
      ? await this.lineupNamesOf(entry.nominationId, limitCache)
      : [];
    for (const lineupName of lineupNames) {
      const lineupLimit = rules.lineupLimits?.[lineupName];
      if (typeof lineupLimit === 'number' && lineupLimit > 0) {
        return lineupLimit;
      }
    }

    // leagueLimits/lineupLimits keys are stored trimmed (see sanitizeLimits).
    const leagueKey = entry.league?.trim();
    const leagueLimit = leagueKey ? rules.leagueLimits?.[leagueKey] : undefined;
    if (typeof leagueLimit === 'number' && leagueLimit > 0) {
      return leagueLimit;
    }

    if (entry.nominationId) {
      const cached = limitCache.resolved.get(entry.nominationId);
      if (cached !== undefined) return cached;
      const resolved = await this.resolveLimit(
        entry.nominationId,
        DEFAULT_DURATION_ROUND,
      );
      limitCache.resolved.set(entry.nominationId, resolved);
      return resolved;
    }

    return DEFAULT_DURATION_LIMIT_SECONDS;
  }

  // How many improvisations one exit holds: a per_program exit is one
  // program; a single exit dances all of its nomination's styles in a row
  // (Battle Queen: two improvisations, twice the improvisation duration).
  async improvisationRoundsOf(
    entry: ImprovisationRoundsInput,
    limitCache: LimitCache = new LimitCache(),
  ): Promise<number> {
    if (entry.program !== null || entry.nominationId === null) {
      return MIN_IMPROVISATION_ROUNDS;
    }
    const cached = limitCache.rounds.get(entry.nominationId);
    if (cached !== undefined) return cached;
    const [row] = await this.nominationModel.sequelize!.query<{
      styles: number;
    }>(COUNT_NOMINATION_STYLES_SQL, {
      bind: [entry.nominationId],
      type: QueryTypes.SELECT,
    });
    const rounds = Math.max(row?.styles ?? 0, MIN_IMPROVISATION_ROUNDS);
    limitCache.rounds.set(entry.nominationId, rounds);
    return rounds;
  }

  // Trimmed names of the lineup categories on the nomination — the keys of
  // CompetitionRule.lineupLimits.
  private async lineupNamesOf(
    nominationId: string,
    limitCache: LimitCache,
  ): Promise<string[]> {
    const cached = limitCache.lineupNames.get(nominationId);
    if (cached !== undefined) return cached;
    const nomination = await this.nominationModel.findByPk(nominationId, {
      attributes: ['id'],
      include: [
        {
          model: Category,
          attributes: ['name'],
          where: { type: LINEUP_CATEGORY_TYPE },
          required: false,
          through: { attributes: [] },
        },
      ],
    });
    const names = (nomination?.categories ?? []).map((category) =>
      category.name.trim(),
    );
    limitCache.lineupNames.set(nominationId, names);
    return names;
  }

  // A duration an admin set on the nomination by hand; null when it follows
  // its league (durationOverridden is false) or has none.
  private async manualLimitOf(
    nominationId: string,
    limitCache: LimitCache,
  ): Promise<number | null> {
    const cached = limitCache.manual.get(nominationId);
    if (cached !== undefined) return cached;
    const nomination = await this.nominationModel.findByPk(nominationId, {
      attributes: ['id', 'durationOverridden', 'durationLimitSeconds'],
    });
    const seconds = nomination?.durationLimitSeconds ?? null;
    const manual =
      nomination?.durationOverridden && seconds !== null && seconds > 0
        ? seconds
        : null;
    limitCache.manual.set(nominationId, manual);
    return manual;
  }

  private async assertCompetitionExists(
    competitionId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    return competition;
  }

  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<Competition> {
    const competition = await this.assertCompetitionExists(competitionId);
    // A global admin manages every competition's timings.
    if (requester.accessLevel === AccessLevel.ADMIN) return competition;
    if (competition.ownerId === requester.id) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requester.id },
    });
    if (!membership) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
    return competition;
  }
}
