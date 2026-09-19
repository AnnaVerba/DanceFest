import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AccessLevel } from '../auth/access-level.enum';
import { CreationAttributes, Op } from 'sequelize';
import type { WhereOptions } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { isUUID } from 'class-validator';
import {
  AGE_CATEGORY_TYPE,
  Category,
  LEAGUE_CATEGORY_TYPE,
} from '../categories/category.model';
import type { CategoryType } from '../categories/category.model';
import { Venue } from '../venues/venue.model';
import { CompetitionRulesService } from '../competition-rules/competition-rules.service';
import { CompetitionRule } from '../competition-rules/competition-rule.model';
import { resolveLeagueDurationSeconds } from '../competition-rules/resolve-league-duration';
import { Nomination } from './nomination.model';
import { planNominationExits, DEFAULT_EXIT_MODE } from './nomination-exits';
import type { NominationExit, NominationProgram } from './nomination-exits';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
import { BulkCreateNominationsDto } from './dto/bulk-create-nominations.dto';
import { BulkSetImprovisationDto } from './dto/bulk-set-improvisation.dto';
import { BulkAssignVenueDto } from './dto/bulk-assign-venue.dto';
import { NominationBulkSelectorDto } from './dto/nomination-bulk-selector.dto';
import { NominationBulkFilterDto } from './dto/nomination-bulk-filter.dto';
import type { NominationPageQuery, VenueSummaryRow } from './nominations.types';
import {
  DEFAULT_NOMINATIONS_PAGE_SIZE,
  LIST_QUERY_SEPARATOR,
  MAX_NOMINATIONS_PAGE_SIZE,
  UNASSIGNED_VENUE_QUERY_VALUE,
} from './nominations.constants';
import {
  NOMINATION_LEAGUE_REQUIRED_MESSAGE,
  NOMINATION_NOT_FOUND_MESSAGE,
  NOMINATION_NOT_IN_COMPETITION_MESSAGE,
  NOMINATION_BULK_SELECTOR_REQUIRED_MESSAGE,
  NO_NOMINATIONS_MATCHED_MESSAGE,
  SOME_NOMINATIONS_NOT_IN_COMPETITION_MESSAGE,
  VENUE_NOT_IN_COMPETITION_MESSAGE,
} from './nominations.constants';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';
import { TYPEAHEAD_LIMIT, resolvePage } from '../common/pagination';
import { bulkCreateChunked } from '../common/bulk-insert';

// A very generous ceiling for a single competition's nomination list.
const MAX_NOMINATIONS = 2000;

const VENUE_SUMMARY_GROUP_TYPES: CategoryType[] = [
  LEAGUE_CATEGORY_TYPE,
  AGE_CATEGORY_TYPE,
];

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
    @InjectModel(Venue)
    private readonly venueModel: typeof Venue,
    private readonly competitionRulesService: CompetitionRulesService,
  ) {}

  // `q` turns this into a name typeahead (a festival can have 500+
  // nominations); without it, the whole list is returned but sanity-capped.
  async listPublic(competitionId: string, rawQuery?: string) {
    await this.assertCompetitionExists(competitionId);
    const q = rawQuery?.trim();
    const nominations = await this.nominationModel.findAll({
      where: q
        ? { competitionId, name: { [Op.iLike]: `%${q}%` } }
        : { competitionId },
      order: [['createdAt', 'ASC']],
      limit: q ? TYPEAHEAD_LIMIT : MAX_NOMINATIONS,
    });

    const categories = await this.loadCategories(nominations);
    return nominations.map((n) => this.toDto(n, categories));
  }

  async create(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: CreateNominationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    this.assertLimitsBelongToNomination(dto);
    await this.assertEveryNominationHasLeague([dto]);

    const attributes = this.toAttributes(competitionId, dto);
    await this.applyAutoDuration(competitionId, dto, attributes);

    const nomination = await this.nominationModel.create(attributes);

    return this.toDto(nomination, await this.loadCategories([nomination]));
  }

  async bulkCreate(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: BulkCreateNominationsDto,
  ) {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    dto.nominations.forEach((n) => this.assertLimitsBelongToNomination(n));
    await this.assertEveryNominationHasLeague(dto.nominations);

    const rules = await this.competitionRulesService.getRules(competitionId);
    const attributesList = await Promise.all(
      dto.nominations.map(async (n) => {
        const attributes = this.toAttributes(competitionId, n);
        await this.applyAutoDuration(competitionId, n, attributes, rules);
        return attributes;
      }),
    );
    const created = await this.nominationModel.sequelize!.transaction(
      (transaction) =>
        bulkCreateChunked(this.nominationModel, attributesList, transaction),
    );

    const categories = await this.loadCategories(created);
    return created.map((n) => this.toDto(n, categories));
  }

  async update(
    competitionId: string,
    nominationId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: UpdateNominationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    const nomination = await this.loadNomination(competitionId, nominationId);

    this.assertLimitsBelongToNomination({
      categoryIds: dto.categoryIds ?? nomination.categoryIds,
      programLimits: dto.programLimits ?? nomination.programLimits,
    });

    if (dto.categoryIds !== undefined) {
      await this.assertEveryNominationHasLeague([
        { name: dto.name ?? nomination.name, categoryIds: dto.categoryIds },
      ]);
    }
    if (dto.venueId !== undefined) {
      await this.assertVenueInCompetition(competitionId, dto.venueId);
      nomination.venueId = dto.venueId;
    }

    const wasImprovisation = nomination.allowsImprovisation;
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
      nomination.durationOverridden = true;
    }
    if (
      nomination.allowsImprovisation !== wasImprovisation &&
      dto.durationLimitSeconds === undefined
    ) {
      await this.reapplyAutoDurations(competitionId, [nomination]);
    }
    if (dto.programLimits !== undefined) {
      nomination.programLimits = dto.programLimits;
    }

    await nomination.save();
    return this.toDto(nomination, await this.loadCategories([nomination]));
  }

  // Improvisation is toggled on hundreds of nominations at once (a whole
  // festival's worth), so it gets its own bulk route rather than forcing one
  // PATCH per nomination. The caller picks either an explicit id list (a
  // hand-picked selection) or a filter (name/category match) — a filter lets
  // "every improvisation nomination" reach the database as one UPDATE
  // instead of a request body listing 700 ids.
  async bulkSetImprovisation(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: BulkSetImprovisationDto,
  ) {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    const { where, nominations } = await this.resolveBulkSelection(
      competitionId,
      dto,
    );

    const flipped = nominations.filter(
      (nomination) => nomination.allowsImprovisation !== dto.allowsImprovisation,
    );
    for (const nomination of nominations) {
      nomination.allowsImprovisation = dto.allowsImprovisation;
    }
    const retimed = await this.reapplyAutoDurations(competitionId, flipped);
    const idsBySeconds = new Map<number | null, string[]>();
    for (const nomination of retimed) {
      const ids = idsBySeconds.get(nomination.durationLimitSeconds);
      if (ids) ids.push(nomination.id);
      else idsBySeconds.set(nomination.durationLimitSeconds, [nomination.id]);
    }

    await this.nominationModel.sequelize!.transaction(async (transaction) => {
      await this.nominationModel.update(
        { allowsImprovisation: dto.allowsImprovisation },
        { where, transaction },
      );
      // One UPDATE per distinct duration, not one per nomination.
      for (const [seconds, ids] of idsBySeconds) {
        await this.nominationModel.update(
          { durationLimitSeconds: seconds },
          { where: { id: { [Op.in]: ids } }, transaction },
        );
      }
    });

    const categories = await this.loadCategories(nominations);
    return nominations.map((nomination) => this.toDto(nomination, categories));
  }

  async bulkAssignVenue(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: BulkAssignVenueDto,
  ) {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    await this.assertVenueInCompetition(competitionId, dto.venueId);
    const { where, nominations } = await this.resolveBulkSelection(
      competitionId,
      dto,
    );

    await this.nominationModel.update({ venueId: dto.venueId }, { where });

    const categories = await this.loadCategories(nominations);
    return nominations.map((nomination) => {
      nomination.venueId = dto.venueId;
      return this.toDto(nomination, categories);
    });
  }

  private async resolveBulkSelection(
    competitionId: string,
    dto: NominationBulkSelectorDto,
  ) {
    const hasIds = dto.nominationIds !== undefined;
    const hasFilter = dto.filter !== undefined;
    if (hasIds === hasFilter) {
      throw new BadRequestException(NOMINATION_BULK_SELECTOR_REQUIRED_MESSAGE);
    }

    const where = this.bulkSelectorWhere(competitionId, dto);
    const nominations = await this.nominationModel.findAll({ where });

    if (hasIds && nominations.length !== new Set(dto.nominationIds).size) {
      throw new BadRequestException(
        SOME_NOMINATIONS_NOT_IN_COMPETITION_MESSAGE,
      );
    }
    if (nominations.length === 0) {
      throw new BadRequestException(NO_NOMINATIONS_MATCHED_MESSAGE);
    }
    return { where, nominations };
  }

  private bulkSelectorWhere(
    competitionId: string,
    dto: NominationBulkSelectorDto,
  ): WhereOptions<Nomination> {
    if (dto.nominationIds !== undefined) {
      return {
        id: { [Op.in]: [...new Set(dto.nominationIds)] },
        competitionId,
      };
    }
    return this.filterWhere(competitionId, dto.filter);
  }

  // Shared by the paged list and the bulk actions, so "select all filtered"
  // on screen is exactly the set a bulk filter touches on the server.
  private filterWhere(
    competitionId: string,
    filter?: NominationBulkFilterDto,
  ): WhereOptions<Nomination> {
    const where: Record<string, unknown> = { competitionId };
    if (filter?.categoryIds?.length) {
      where.categoryIds = { [Op.contains]: filter.categoryIds };
    }
    const q = filter?.q?.trim();
    if (q) {
      where.name = { [Op.iLike]: `%${q}%` };
    }
    if (filter?.venueId !== undefined) {
      where.venueId = filter.venueId;
    }
    return where;
  }

  // Same audience as listPublic: the Номінації tab shows the list to viewers
  // who cannot manage the competition too.
  async listPage(competitionId: string, query: NominationPageQuery) {
    await this.assertCompetitionExists(competitionId);
    const { page, pageSize, limit, offset } = resolvePage(
      query.page,
      query.pageSize,
      DEFAULT_NOMINATIONS_PAGE_SIZE,
      MAX_NOMINATIONS_PAGE_SIZE,
    );
    const { rows, count } = await this.nominationModel.findAndCountAll({
      where: this.filterWhere(competitionId, this.parsePageFilter(query)),
      order: [
        ['isSpecial', 'DESC'],
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
      limit,
      offset,
    });
    const categories = await this.loadCategories(rows);
    return {
      rows: rows.map((n) => this.toDto(n, categories)),
      total: count,
      page,
      pageSize,
    };
  }

  // Malformed ids are dropped rather than reaching Postgres as a uuid cast
  // error.
  private parsePageFilter(query: NominationPageQuery): NominationBulkFilterDto {
    const categoryIds = (query.categoryIds ?? '')
      .split(LIST_QUERY_SEPARATOR)
      .filter((id) => isUUID(id));
    let venueId: string | null | undefined;
    if (query.venue === UNASSIGNED_VENUE_QUERY_VALUE) venueId = null;
    else if (query.venue && isUUID(query.venue)) venueId = query.venue;
    return { categoryIds, q: query.q, venueId };
  }

  // Per league (or age category) present in the competition: how many
  // nominations it has and how many still lack a venue.
  async venueSummary(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    rawGroupBy?: string,
  ): Promise<VenueSummaryRow[]> {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
    const type =
      VENUE_SUMMARY_GROUP_TYPES.find((t) => t === rawGroupBy) ??
      LEAGUE_CATEGORY_TYPE;

    const [categories, nominations] = await Promise.all([
      this.categoryModel.findAll({
        where: { type },
        order: [
          ['sortOrder', 'ASC'],
          ['name', 'ASC'],
        ],
      }),
      this.nominationModel.findAll({
        where: { competitionId },
        attributes: ['categoryIds', 'venueId'],
      }),
    ]);

    const rows = new Map<string, VenueSummaryRow>(
      categories.map((c) => [
        c.id,
        { categoryId: c.id, name: c.name, total: 0, unassigned: 0 },
      ]),
    );
    for (const nomination of nominations) {
      for (const id of nomination.categoryIds) {
        const row = rows.get(id);
        if (!row) continue;
        row.total += 1;
        if (nomination.venueId === null) row.unassigned += 1;
      }
    }
    return [...rows.values()].filter((row) => row.total > 0);
  }

  private async assertVenueInCompetition(
    competitionId: string,
    venueId: string | null,
  ): Promise<void> {
    if (venueId === null) return;
    const venue = await this.venueModel.findOne({
      where: { id: venueId, competitionId },
    });
    if (!venue) {
      throw new BadRequestException(VENUE_NOT_IN_COMPETITION_MESSAGE);
    }
  }

  async remove(
    competitionId: string,
    nominationId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );
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

  // Nomination price per id — what an entry against that nomination costs
  // (BUG-28's "Мої заявки" total, same field TASK-20 reads elsewhere).
  async findPricesByIds(ids: string[]): Promise<Map<string, number | null>> {
    if (ids.length === 0) return new Map();
    const nominations = await this.nominationModel.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'price'],
    });
    return new Map(
      nominations.map((n) => [n.id, n.price === null ? null : Number(n.price)]),
    );
  }

  private toAttributes(
    competitionId: string,
    dto: CreateNominationDto,
  ): CreationAttributes<Nomination> {
    return {
      competitionId,
      templateId: dto.templateId ?? null,
      name: dto.name.trim(),
      price: dto.price ?? null,
      allowsImprovisation: dto.allowsImprovisation ?? false,
      categoryIds: dto.categoryIds ?? [],
      isSpecial: dto.isSpecial ?? false,
      exitMode: dto.exitMode ?? DEFAULT_EXIT_MODE,
      durationLimitSeconds: dto.durationLimitSeconds ?? null,
      programLimits: dto.programLimits ?? {},
    } as CreationAttributes<Nomination>;
  }

  // TASK-07: a nomination's duration follows its league unless it's
  // improvisation (that has its own separate timing, see competition rules'
  // improvGroupSeconds/improvIndividualSeconds) or an admin already set it by
  // hand (durationOverridden stops later league-duration changes from
  // clobbering that choice — see BUG-10).
  private async applyAutoDuration(
    competitionId: string,
    input: {
      categoryIds?: string[];
      allowsImprovisation?: boolean;
      durationLimitSeconds?: number;
    },
    attributes: CreationAttributes<Nomination>,
    rules?: CompetitionRule,
  ): Promise<void> {
    if (input.durationLimitSeconds !== undefined) {
      attributes.durationOverridden = true;
      return;
    }

    attributes.durationOverridden = false;
    if (input.allowsImprovisation) {
      attributes.durationLimitSeconds = null;
      return;
    }

    const effectiveRules =
      rules ?? (await this.competitionRulesService.getRules(competitionId));
    attributes.durationLimitSeconds = this.autoDurationSeconds(
      input,
      await this.leagueNamesById(input.categoryIds ?? []),
      effectiveRules,
    );
  }

  // An improvisation flip moves a nomination between TASK-07's two duration
  // sources; one whose duration was set by hand keeps it. Returns the
  // nominations it retimed (in memory only — the caller persists them).
  private async reapplyAutoDurations(
    competitionId: string,
    nominations: Nomination[],
  ): Promise<Nomination[]> {
    const automatic = nominations.filter((n) => !n.durationOverridden);
    if (automatic.length === 0) return [];

    const rules = await this.competitionRulesService.getRules(competitionId);
    const leagueNames = await this.leagueNamesById(
      automatic.flatMap((n) => n.categoryIds),
    );
    for (const nomination of automatic) {
      nomination.durationLimitSeconds = this.autoDurationSeconds(
        nomination,
        leagueNames,
        rules,
      );
    }
    return automatic;
  }

  // TASK-07's rule: improvisation has no duration of its own, a regular
  // nomination runs for its league's.
  private autoDurationSeconds(
    nomination: { categoryIds?: string[]; allowsImprovisation?: boolean },
    leagueNames: Map<string, string>,
    rules: CompetitionRule,
  ): number | null {
    if (nomination.allowsImprovisation) return null;
    const leagueId = (nomination.categoryIds ?? []).find((id) =>
      leagueNames.has(id),
    );
    return resolveLeagueDurationSeconds(
      rules.leagueLimits,
      leagueId ? (leagueNames.get(leagueId) ?? null) : null,
    );
  }

  // league category id -> name, in one query for any number of nominations.
  private async leagueNamesById(
    categoryIds: string[],
  ): Promise<Map<string, string>> {
    if (categoryIds.length === 0) return new Map();
    const leagues = await this.categoryModel.findAll({
      where: {
        id: { [Op.in]: [...new Set(categoryIds)] },
        type: LEAGUE_CATEGORY_TYPE,
      },
      attributes: ['id', 'name'],
    });
    return new Map(leagues.map((league) => [league.id, league.name]));
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

  // The apply form files every entry under a league, so a nomination
  // without one could never be applied to.
  private async assertEveryNominationHasLeague(
    inputs: { name: string; categoryIds?: string[] }[],
  ): Promise<void> {
    const ids = [...new Set(inputs.flatMap((n) => n.categoryIds ?? []))];
    const leagues =
      ids.length === 0
        ? []
        : await this.categoryModel.findAll({
            where: { id: { [Op.in]: ids }, type: LEAGUE_CATEGORY_TYPE },
          });
    const leagueIds = new Set(leagues.map((c) => c.id));
    const withoutLeague = inputs.filter(
      (n) => !(n.categoryIds ?? []).some((id) => leagueIds.has(id)),
    );
    if (withoutLeague.length > 0) {
      throw new BadRequestException(
        `${NOMINATION_LEAGUE_REQUIRED_MESSAGE}: ${withoutLeague
          .map((n) => n.name)
          .join(', ')}`,
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
    return this.categoriesFor(nomination, categories, 'style').map((c) => ({
      id: c.id,
      name: c.name,
    }));
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
      throw new BadRequestException(NOMINATION_NOT_IN_COMPETITION_MESSAGE);
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
      throw new NotFoundException(NOMINATION_NOT_FOUND_MESSAGE);
    }
    return nomination;
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
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<Competition> {
    const competition = await this.assertCompetitionExists(competitionId);
    // A global admin manages every competition.
    if (requesterLevel === AccessLevel.ADMIN) return competition;
    if (competition.ownerId === requesterId) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
    return competition;
  }

  private toDto(nomination: Nomination, categories: Map<string, Category>) {
    return {
      id: nomination.id,
      templateId: nomination.templateId,
      venueId: nomination.venueId,
      name: nomination.name,
      price: nomination.price === null ? null : Number(nomination.price),
      allowsImprovisation: nomination.allowsImprovisation,
      categoryIds: nomination.categoryIds,
      isSpecial: nomination.isSpecial,
      exitMode: nomination.exitMode,
      durationLimitSeconds: nomination.durationLimitSeconds,
      durationOverridden: nomination.durationOverridden,
      programLimits: nomination.programLimits ?? {},
      programs: this.programsFor(nomination, categories),
      leagues: this.categoriesFor(nomination, categories, 'level').map(
        (c) => c.name,
      ),
      lineups: this.categoriesFor(nomination, categories, 'lineup').map(
        (c) => c.name,
      ),
      ageCategories: this.categoriesFor(nomination, categories, 'age').map(
        (c) => ({ name: c.name, ageFrom: c.ageFrom, ageTo: c.ageTo }),
      ),
      exits: this.exitsOf(nomination, categories),
      createdAt: nomination.createdAt,
    };
  }
}
