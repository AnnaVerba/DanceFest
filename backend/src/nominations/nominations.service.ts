import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { AccessLevel } from '../auth/access-level.enum';
import { CreationAttributes, Op, QueryTypes, literal } from 'sequelize';
import type { Transaction, WhereOptions } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { isUUID } from 'class-validator';
import {
  AGE_CATEGORY_TYPE,
  CATEGORY_TYPES,
  Category,
  LEAGUE_CATEGORY_TYPE,
  LINEUP_CATEGORY_TYPE,
  MIN_PARTICIPANT_AGE,
} from '../categories/category.model';
import type { CategoryType } from '../categories/category.model';
import type { AgeCategoryRange } from '../categories/resolve-age-category';
import { ageCategoriesFittingAges } from '../categories/resolve-age-category';
import { PRICED_AXES, isPricedAxis } from '../categories/priced-axes';
import { Venue } from '../venues/venue.model';
import { Entry } from '../entries/entry.model';
import { ScheduleService } from '../schedule/schedule.service';
import { CompetitionRulesService } from '../competition-rules/competition-rules.service';
import { CompetitionRule } from '../competition-rules/competition-rule.model';
import { resolveLeagueDurationSeconds } from '../competition-rules/resolve-league-duration';
import { Nomination } from './nomination.model';
import { NominationCategory } from './nomination-category.model';
import {
  CATEGORY_SOURCE,
  CATEGORY_SOURCE_CONDITIONS,
} from './category-source';
import type { CategorySource } from './category-source';
import { planNominationExits, DEFAULT_EXIT_MODE } from './nomination-exits';
import type { NominationExit, NominationProgram } from './nomination-exits';
import { CreateNominationDto } from './dto/create-nomination.dto';
import { UpdateNominationDto } from './dto/update-nomination.dto';
import { BulkCreateNominationsDto } from './dto/bulk-create-nominations.dto';
import { BulkSetImprovisationDto } from './dto/bulk-set-improvisation.dto';
import { BulkAssignVenueDto } from './dto/bulk-assign-venue.dto';
import { BulkSetAxisPricesDto } from './dto/bulk-set-axis-prices.dto';
import { NominationBulkSelectorDto } from './dto/nomination-bulk-selector.dto';
import { NominationBulkFilterDto } from './dto/nomination-bulk-filter.dto';
import type {
  AxisPriceRow,
  AxisPriceUpdateResult,
  NominationAxes,
  NominationEntryQuery,
  NominationPageQuery,
  NominationSpecialsQuery,
  VenueSummaryRow,
} from './nominations.types';
import { AxisPriceTable } from './axis-price-table';
import {
  DEFAULT_NOMINATIONS_PAGE_SIZE,
  LIST_QUERY_SEPARATOR,
  MAX_NOMINATIONS_PAGE_SIZE,
  UNASSIGNED_VENUE_QUERY_VALUE,
} from './nominations.constants';
import {
  AXIS_PRICE_DUPLICATE_MESSAGE,
  AXIS_PRICE_NOT_IN_COMPETITION_MESSAGE,
  AXIS_PRICE_WRONG_AXIS_MESSAGE,
  NOMINATION_LEAGUE_REQUIRED_MESSAGE,
  NOMINATION_NOT_FOUND_MESSAGE,
  NOMINATION_NOT_IN_COMPETITION_MESSAGE,
  NOMINATION_BULK_SELECTOR_REQUIRED_MESSAGE,
  NOMINATION_ENTRY_FILTER_REQUIRED_MESSAGE,
  NO_NOMINATIONS_MATCHED_MESSAGE,
  SOME_NOMINATIONS_NOT_IN_COMPETITION_MESSAGE,
  SPECIAL_NAME_REQUIRED_MESSAGE,
  VENUE_NOT_IN_COMPETITION_MESSAGE,
} from './nominations.constants';
import { normalizeSpecialName, specialGroupKey } from './special-name';
import { SpecialNominationGroups } from './special-nomination-groups';
import type { NominationPricing } from './nomination-pricing.interface';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';
import { TYPEAHEAD_LIMIT, resolvePage } from '../common/pagination';
import { bulkCreateChunked } from '../common/bulk-insert';

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
    @InjectModel(NominationCategory)
    private readonly nominationCategoryModel: typeof NominationCategory,
    @InjectModel(Category)
    private readonly categoryModel: typeof Category,
    @InjectModel(Venue)
    private readonly venueModel: typeof Venue,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    private readonly competitionRulesService: CompetitionRulesService,
    private readonly scheduleService: ScheduleService,
    private readonly specialGroups: SpecialNominationGroups,
  ) {}

  // `q` turns this into a name typeahead (a festival can have 500+
  // nominations) — лише там ліміт доречний, бо підказка й не обіцяє повноти.
  //
  // Без `q` повертається ВЕСЬ список і ніколи не обрізається. Стеля тут
  // коштувала вікових категорій: сторінка подачі збирає з цієї відповіді
  // випадні списки віку, ліги та стилю, і все, що не влізло, зникало з них
  // мовчки — відповідь виглядала повною. Обсяг обмежений одним конкурсом,
  // а кому потрібні сторінки, той бере `/nominations/paged`.
  async listPublic(competitionId: string, rawQuery?: string) {
    await this.assertCompetitionExists(competitionId);
    const q = rawQuery?.trim();
    const nominations = await this.nominationModel.findAll({
      where: q
        ? { competitionId, name: { [Op.iLike]: `%${q}%` } }
        : { competitionId },
      order: [['createdAt', 'ASC']],
      limit: q ? TYPEAHEAD_LIMIT : undefined,
    });

    const categories = await this.loadCategories(nominations);
    return nominations.map((n) => this.toDto(n, categories));
  }

  /**
   * Осі конкурсу: значення категорій, які реально зустрічаються в його
   * звичайних номінаціях, по одному списку на вісь.
   *
   * Форма заявки будує з цього випадні списки ліги, віку та стилю, а
   * налаштування розкладу — перелік ліг. Тягнути заради десятка назв усі
   * номінації конкурсу (їх буває шість тисяч) не треба, а обрізати вибірку
   * лімітом — тим паче: саме так вікова категорія, яка є і в базі, і в
   * номінації, зникала зі списку при подачі.
   *
   * Вісь ліги — єдина, що рахується і по спецномінаціях: заявник обирає лігу
   * до того, як побачить номінації, і саме її id іде в /specials. Ліга, яка
   * трапляється лише у спецномінації, без цього не мала б id і фільтрувати
   * за нею було б нічим.
   */
  async listAxes(competitionId: string): Promise<NominationAxes> {
    await this.assertCompetitionExists(competitionId);
    const categories = await this.loadCompetitionCategories(
      competitionId,
      CATEGORY_SOURCE.REGULAR_WITH_SPECIAL_LEAGUES,
    );

    const axes = CATEGORY_TYPES.reduce((acc, type) => {
      acc[type] = [];
      return acc;
    }, {} as NominationAxes);

    for (const category of categories) {
      axes[category.type].push({
        id: category.id,
        name: category.name,
        rangeFrom: category.rangeFrom,
        rangeTo: category.rangeTo,
        description: category.description,
      });
    }
    return axes;
  }

  /**
   * Спеціальні номінації конкурсу — ті, що підходять заявнику. Стилю і складу
   * вони не несуть, зате мають лігу (без неї номінацію не створити) і часто
   * вікову категорію, тож звужуються за тими самими правилами, що й звичайні:
   * ліга — точний збіг, вік має вмістити кожного учасника номера.
   *
   * Без фільтрів повертаються всі: список спецномінацій конкурсу — десятки
   * рядків, і обрізати його лімітом нема за чим.
   */
  async listSpecials(competitionId: string, query: NominationSpecialsQuery) {
    await this.assertCompetitionExists(competitionId);

    const conditions: Record<string, unknown>[] = [
      { competitionId, isSpecial: true },
    ];
    if (query.league && isUUID(query.league)) {
      conditions.push(this.withAllCategories([query.league]));
    }
    const ages = this.parseAges(query.ages);
    const ageCategory =
      query.ageCategory && isUUID(query.ageCategory) ? query.ageCategory : null;
    if (ageCategory !== null || ages.length > 0) {
      const specialCategories = await this.loadCompetitionCategories(
        competitionId,
        CATEGORY_SOURCE.SPECIAL,
      );
      conditions.push(
        ageCategory !== null
          ? this.chosenAgeCategoryCondition(specialCategories, ageCategory)
          : this.ageCondition(specialCategories, ages),
      );
    }

    const nominations = await this.nominationModel.findAll({
      where: { [Op.and]: conditions } as WhereOptions<Nomination>,
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const categories = await this.loadCategories(nominations);
    return nominations.map((n) => this.toDto(n, categories));
  }

  /**
   * Номінації під конкретну заявку: ліга та склад мусять збігатися, стиль —
   * будь-який з обраних, вік — підходити кожному учаснику номера.
   *
   * Без жодного фільтра вибірка дорівнює всьому конкурсу, тож вона
   * відхиляється: форма заявки завжди знає хоча б стиль, а тихо віддати
   * шість тисяч рядків (або обрізати їх) — те, від чого ми тут і йдемо.
   */
  async listForEntry(competitionId: string, query: NominationEntryQuery) {
    await this.assertCompetitionExists(competitionId);

    // Ліга й обрана вікова категорія — точний збіг: номінація без них
    // заявнику не підходить (саме так це працювало на клієнті).
    const exact = [query.league, query.ageCategory].filter(
      (id): id is string => typeof id === 'string' && isUUID(id),
    );
    const styleIds = this.parseIdList(query.styles);
    const lineupIds = this.parseIdList(query.lineups);
    if (exact.length === 0 && styleIds.length === 0 && lineupIds.length === 0) {
      throw new BadRequestException(NOMINATION_ENTRY_FILTER_REQUIRED_MESSAGE);
    }

    const categories = await this.loadCompetitionCategories(competitionId);
    const conditions: Record<string, unknown>[] = [
      { competitionId, isSpecial: false },
    ];
    if (exact.length > 0) {
      conditions.push(this.withAllCategories(exact));
    }
    // Стиль — навпаки: номінація без стилю не є номінацією жодного з
    // обраних, тож сюди «осі немає» не поширюється.
    if (styleIds.length > 0) {
      conditions.push(this.withAnyCategory(styleIds));
    }
    if (lineupIds.length > 0) {
      conditions.push(
        this.axisOrMissingCondition(
          this.axisIdsOf(categories, LINEUP_CATEGORY_TYPE),
          lineupIds,
        ),
      );
    }
    const ages = this.parseAges(query.ages);
    if (ages.length > 0) {
      conditions.push(this.ageCondition(categories, ages));
    }

    const nominations = await this.nominationModel.findAll({
      where: { [Op.and]: conditions } as WhereOptions<Nomination>,
      order: [
        ['createdAt', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    const rowCategories = await this.loadCategories(nominations);
    return nominations.map((n) => this.toDto(n, rowCategories));
  }

  /**
   * Номінація проходить за віком, коли її вікова категорія вміщує кожного
   * учасника номера. Категорії без нижньої межі у підборі не беруть участі —
   * порівнювати з ними нема чого; порожня верхня межа означає «і старші».
   */
  private ageCondition(
    categories: Category[],
    ages: number[],
  ): Record<string, unknown> {
    const bounded = categories
      .filter((category) => category.type === AGE_CATEGORY_TYPE)
      .filter((category) => category.rangeFrom !== null);
    const fitting = ageCategoriesFittingAges(ages, bounded);
    return this.axisOrMissingCondition(
      bounded.map((category) => category.id),
      fitting.map((category) => category.id),
    );
  }

  /**
   * Вікова категорія, яку заявник обрав явно: збіг по id, а не по
   * межах. Частина категорій живе без заповнених меж — підбір за віком їх
   * просто не бачить, і номінація з такою категорією проходила б завжди.
   * Номінація без вікової осі проходить: вона ніяким віком не обмежена.
   */
  private chosenAgeCategoryCondition(
    categories: Category[],
    ageCategoryId: string,
  ): Record<string, unknown> {
    return this.axisOrMissingCondition(
      this.axisIdsOf(categories, AGE_CATEGORY_TYPE),
      [ageCategoryId],
    );
  }

  /**
   * Вісь звужує вибірку лише там, де вона взагалі є: номінація без жодного
   * значення цієї осі нею не обмежена, і ховати її від заявника не можна —
   * інакше зникають номінації, у яких вік чи склад просто не проставлений.
   */
  private axisOrMissingCondition(
    axisIds: string[],
    matchingIds: string[],
  ): Record<string, unknown> {
    if (axisIds.length === 0) return {};

    const withoutAxis = this.withoutAnyCategory(axisIds);
    if (matchingIds.length === 0) return withoutAxis;

    return {
      [Op.or]: [this.withAnyCategory(matchingIds), withoutAxis],
    };
  }

  private axisIdsOf(categories: Category[], type: CategoryType): string[] {
    return categories
      .filter((category) => category.type === type)
      .map((category) => category.id);
  }

  /**
   * Категорії, використані номінаціями конкурсу. DISTINCT робить Postgres:
   * витягати тисячі масивів у пам'ять заради десятка унікальних id — саме
   * те, чого ці ендпойнти позбуваються.
   */
  private async loadCompetitionCategories(
    competitionId: string,
    source: CategorySource = CATEGORY_SOURCE.REGULAR,
  ): Promise<Category[]> {
    const rows = await this.nominationModel.sequelize!.query<{ id: string }>(
      `SELECT DISTINCT link."categoryId" AS id
         FROM nomination_categories link
         JOIN nominations n ON n.id = link."nominationId"
         JOIN categories c ON c.id = link."categoryId"
        WHERE n."competitionId" = :competitionId
          AND ${CATEGORY_SOURCE_CONDITIONS[source]}`,
      {
        replacements: { competitionId, leagueType: LEAGUE_CATEGORY_TYPE },
        type: QueryTypes.SELECT,
      },
    );
    const ids = rows.map((row) => row.id);
    if (ids.length === 0) return [];

    return this.categoryModel.findAll({
      where: { id: { [Op.in]: ids } },
      order: [
        ['sortOrder', 'ASC'],
        ['rangeFrom', 'ASC NULLS LAST'],
        ['name', 'ASC'],
      ],
    });
  }

  private parseIdList(raw?: string): string[] {
    return (raw ?? '')
      .split(LIST_QUERY_SEPARATOR)
      .map((value) => value.trim())
      .filter((value) => isUUID(value));
  }

  // Вік приходить порахованим на дату початку конкурсу; усе, що не ціле
  // невід'ємне число, віком не є й фільтр не звужує.
  private parseAges(raw?: string): number[] {
    return (raw ?? '')
      .split(LIST_QUERY_SEPARATOR)
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((age) => Number.isInteger(age) && age >= MIN_PARTICIPANT_AGE);
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

    const nomination = await this.nominationModel.sequelize!.transaction(
      async (transaction) => {
        const explicit = await this.specialGroups.assign(
          competitionId,
          [attributes],
          transaction,
        );
        const created = await this.nominationModel.create(attributes, {
          transaction,
        });
        await this.saveCategoryLinks(
          [{ nominationId: created.id, categoryIds: dto.categoryIds ?? [] }],
          transaction,
        );
        await this.specialGroups.alignExplicit(
          competitionId,
          explicit,
          transaction,
        );
        return created;
      },
    );

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
      async (transaction) => {
        const explicit = await this.specialGroups.assign(
          competitionId,
          attributesList,
          transaction,
        );
        const rows = await bulkCreateChunked(
          this.nominationModel,
          attributesList,
          transaction,
        );
        await this.saveCategoryLinks(
          rows.map((row, index) => ({
            nominationId: row.id,
            categoryIds: dto.nominations[index].categoryIds ?? [],
          })),
          transaction,
        );
        await this.specialGroups.alignExplicit(
          competitionId,
          explicit,
          transaction,
        );
        return rows;
      },
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
    const venueChanged =
      dto.venueId !== undefined && dto.venueId !== nomination.venueId;
    if (dto.venueId !== undefined) {
      await this.assertVenueInCompetition(competitionId, dto.venueId);
      nomination.venueId = dto.venueId;
    }

    const wasImprovisation = nomination.allowsImprovisation;
    const renamed =
      dto.name !== undefined && dto.name.trim() !== nomination.name;
    if (dto.name !== undefined) nomination.name = dto.name.trim();
    if (dto.price !== undefined) nomination.price = dto.price ?? null;
    if (dto.allowsImprovisation !== undefined) {
      nomination.allowsImprovisation = dto.allowsImprovisation;
    }
    const categoryIdsChanged = dto.categoryIds !== undefined;
    if (dto.isSpecial !== undefined) nomination.isSpecial = dto.isSpecial;
    let specialNameChanged = false;
    if (dto.specialName !== undefined && dto.specialName !== null) {
      nomination.specialName = normalizeSpecialName(dto.specialName);
      specialNameChanged = true;
    }
    if (!nomination.isSpecial) {
      nomination.specialName = null;
    } else if (!nomination.specialName) {
      throw new BadRequestException(SPECIAL_NAME_REQUIRED_MESSAGE);
    }
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

    await nomination.sequelize!.transaction(async (transaction) => {
      if (nomination.isSpecial && specialNameChanged) {
        const canonical = await this.specialGroups.canonicalNames(
          competitionId,
          [nomination.specialName as string],
          transaction,
        );
        nomination.specialName = canonical.get(
          nomination.specialName as string,
        ) as string;
        const groupPrice =
          dto.price === undefined
            ? await this.specialGroups.findGroupPrice(
                competitionId,
                nomination.specialName,
                transaction,
              )
            : null;
        if (groupPrice !== null) nomination.price = groupPrice;
      }
      await nomination.save({ transaction });
      if (categoryIdsChanged) {
        await this.nominationCategoryModel.destroy({
          where: { nominationId: nomination.id },
          transaction,
        });
        await this.saveCategoryLinks(
          [
            {
              nominationId: nomination.id,
              categoryIds: dto.categoryIds as string[],
            },
          ],
          transaction,
        );
        nomination.categories = await this.categoryModel.findAll({
          where: { id: { [Op.in]: dto.categoryIds as string[] } },
          transaction,
        });
      }
      if (nomination.isSpecial && dto.price !== undefined) {
        await this.specialGroups.alignPrice(
          competitionId,
          nomination.specialName as string,
          nomination.price,
          transaction,
        );
      }
    });
    // Entries keep a copy of the nomination's name, which the program,
    // start list and results print — a rename must reach them (TASK-15).
    if (renamed) {
      await this.entryModel.update(
        { nomination: nomination.name },
        { where: { nominationId: nomination.id } },
      );
    }
    if (venueChanged) {
      await this.scheduleService.relocateToVenue(
        competitionId,
        [nomination.id],
        nomination.venueId,
      );
    }
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
    // Their scheduled exits follow them to the new venue's program.
    await this.scheduleService.relocateToVenue(
      competitionId,
      nominations
        .filter((nomination) => nomination.venueId !== dto.venueId)
        .map((nomination) => nomination.id),
      dto.venueId,
    );

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
      Object.assign(where, this.withAllCategories(filter.categoryIds));
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

    // Рахує Postgres: тягнути всі номінації конкурсу в пам'ять заради двох
    // лічильників — саме те, від чого ми тут ідемо.
    const [categories, counts] = await Promise.all([
      this.categoryModel.findAll({
        where: { type },
        order: [
          ['sortOrder', 'ASC'],
          ['name', 'ASC'],
        ],
      }),
      this.nominationModel.sequelize!.query<{
        categoryId: string;
        total: string;
        unassigned: string;
      }>(
        `SELECT link."categoryId" AS "categoryId",
                count(*) AS total,
                count(*) FILTER (WHERE n."venueId" IS NULL) AS unassigned
           FROM nomination_categories link
           JOIN nominations n ON n.id = link."nominationId"
          WHERE n."competitionId" = :competitionId
          GROUP BY link."categoryId"`,
        { replacements: { competitionId }, type: QueryTypes.SELECT },
      ),
    ]);

    const byCategory = new Map(counts.map((row) => [row.categoryId, row]));
    return categories
      .map((category) => {
        const counted = byCategory.get(category.id);
        return {
          categoryId: category.id,
          name: category.name,
          total: Number(counted?.total ?? 0),
          unassigned: Number(counted?.unassigned ?? 0),
        };
      })
      .filter((row) => row.total > 0);
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

  // Значення складу й ліги, що трапляються в номінаціях цього конкурсу, з
  // ціною, яку вони там мають. Панель номінацій показує їх як поля цін.
  async axisPrices(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<AxisPriceRow[]> {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );

    const [categories, nominations] = await Promise.all([
      this.categoryModel.findAll({
        where: { type: { [Op.in]: PRICED_AXES } },
        order: [
          ['sortOrder', 'ASC'],
          ['name', 'ASC'],
        ],
      }),
      this.pricedNominations(competitionId),
    ]);

    const rows = new Map<string, AxisPriceRow>(
      categories.map((c) => [
        c.id,
        {
          categoryId: c.id,
          type: c.type,
          name: c.name,
          nominationCount: 0,
          price: null,
        },
      ]),
    );
    // Значення, номінації якого коштують по-різному: ціни в нього немає, і
    // поле лишиться порожнім, поки організатор не задасть одну на всіх.
    const mixed = new Set<string>();

    for (const nomination of nominations) {
      const price = nomination.price === null ? null : Number(nomination.price);
      for (const categoryId of nomination.categoryIds) {
        const row = rows.get(categoryId);
        if (!row) continue;

        if (!mixed.has(categoryId)) {
          if (row.nominationCount === 0) row.price = price;
          else if (row.price !== price) {
            mixed.add(categoryId);
            row.price = null;
          }
        }
        row.nominationCount += 1;
      }
    }
    return [...rows.values()].filter((row) => row.nominationCount > 0);
  }

  /**
   * Ставить ціни на значеннях складу й ліги в межах одного конкурсу. Шаблон,
   * з якого скопійовано номінації, лишається недоторканим: тут правиться
   * тільки `nominations.price` цього конкурсу.
   */
  async bulkSetAxisPrices(
    competitionId: string,
    requesterId: string,
    requesterLevel: AccessLevel,
    dto: BulkSetAxisPricesDto,
  ): Promise<AxisPriceUpdateResult> {
    await this.loadCompetitionAndAssertAccess(
      competitionId,
      requesterId,
      requesterLevel,
    );

    const priceByCategoryId = new Map<string, number>();
    for (const { categoryId, price } of dto.prices) {
      const known = priceByCategoryId.get(categoryId);
      if (known !== undefined && known !== price) {
        throw new BadRequestException(AXIS_PRICE_DUPLICATE_MESSAGE);
      }
      priceByCategoryId.set(categoryId, price);
    }

    const categoryIds = [...priceByCategoryId.keys()];
    const categories = await this.categoryModel.findAll({
      where: { id: { [Op.in]: categoryIds } },
    });
    if (categories.some((category) => !isPricedAxis(category.type))) {
      throw new BadRequestException(AXIS_PRICE_WRONG_AXIS_MESSAGE);
    }

    const nominations = await this.pricedNominations(competitionId);
    const used = new Set(nominations.flatMap((n) => n.categoryIds));
    if (categoryIds.some((categoryId) => !used.has(categoryId))) {
      throw new BadRequestException(AXIS_PRICE_NOT_IN_COMPETITION_MESSAGE);
    }

    const table = new AxisPriceTable(
      categories.map((category) => ({
        categoryId: category.id,
        type: category.type,
        price: priceByCategoryId.get(category.id) as number,
      })),
    );

    const idsByPrice = new Map<number, string[]>();
    for (const nomination of nominations) {
      const price = table.priceFor(nomination.categoryIds);
      if (price === null) continue;
      if (nomination.price !== null && Number(nomination.price) === price) {
        continue;
      }
      const ids = idsByPrice.get(price);
      if (ids) ids.push(nomination.id);
      else idsByPrice.set(price, [nomination.id]);
    }

    await this.nominationModel.sequelize!.transaction(async (transaction) => {
      // Один UPDATE на кожну ціну, а не на кожну номінацію.
      for (const [price, ids] of idsByPrice) {
        await this.nominationModel.update(
          { price },
          { where: { id: { [Op.in]: ids } }, transaction },
        );
      }
    });

    return {
      updated: [...idsByPrice.values()].reduce(
        (total, ids) => total + ids.length,
        0,
      ),
    };
  }

  // Номінації, ціну яких виводять осі. Спеціальні сюди не входять: їхня ціна
  // спільна для всієї групи з однаковою назвою й задається окремо.
  private async pricedNominations(
    competitionId: string,
  ): Promise<Nomination[]> {
    const nominations = await this.nominationModel.findAll({
      where: { competitionId, isSpecial: false },
      attributes: ['id', 'price'],
    });
    await this.loadCategories(nominations);
    return nominations;
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
    ageRange: AgeCategoryRange | null;
    league: string | null;
  }> {
    const nomination = ref.nominationId
      ? await this.loadNomination(competitionId, ref.nominationId)
      : await this.loadNominationByName(competitionId, ref.name ?? '');

    const categories = await this.loadCategories([nomination]);
    const byType = (type: string) =>
      this.categoriesFor(nomination, categories, type)[0]?.name ?? null;
    const [ageCategory] = this.categoriesFor(nomination, categories, 'age');

    return {
      nomination,
      exits: this.exitsOf(nomination, categories),
      ageCategory: byType('age'),
      ageRange: ageCategory ?? null,
      league: byType('level'),
    };
  }

  // Price and pay-once group of each nomination — what an entry against it
  // costs (see EntryChargeCalculator).
  async findPricingByIds(
    ids: string[],
  ): Promise<Map<string, NominationPricing>> {
    if (ids.length === 0) return new Map();
    const nominations = await this.nominationModel.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: ['id', 'competitionId', 'price', 'isSpecial', 'specialName'],
    });
    return new Map(
      nominations.map((n) => [
        n.id,
        {
          competitionId: n.competitionId,
          price: n.price === null ? null : Number(n.price),
          specialGroupKey:
            n.isSpecial && n.specialName
              ? specialGroupKey(n.competitionId, n.specialName)
              : null,
        },
      ]),
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
      isSpecial: dto.isSpecial ?? false,
      specialName: dto.isSpecial ? (dto.specialName ?? null) : null,
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

  /**
   * Категорії переданих номінацій — і водночас єдине місце, де осі
   * потрапляють у самі рядки. Поки цього не сталося, `nomination.categoryIds`
   * кидає: краще гучно, ніж мовчазний порожній масив.
   */
  private async loadCategories(
    nominations: Nomination[],
  ): Promise<Map<string, Category>> {
    if (nominations.length === 0) return new Map();

    const links = await this.nominationCategoryModel.findAll({
      where: { nominationId: { [Op.in]: nominations.map((n) => n.id) } },
    });
    const ids = [...new Set(links.map((link) => link.categoryId))];
    const categories =
      ids.length === 0
        ? []
        : await this.categoryModel.findAll({ where: { id: { [Op.in]: ids } } });

    const byId = new Map(categories.map((c) => [c.id, c]));
    const byNomination = new Map<string, Category[]>();
    for (const link of links) {
      const category = byId.get(link.categoryId);
      if (!category) continue;
      const bucket = byNomination.get(link.nominationId);
      if (bucket) bucket.push(category);
      else byNomination.set(link.nominationId, [category]);
    }
    for (const nomination of nominations) {
      nomination.categories = byNomination.get(nomination.id) ?? [];
    }
    return byId;
  }

  /**
   * Осі щойно створених номінацій. Порядок `attributes` і `rows` збігається,
   * тож id беруться попарно.
   */
  private async saveCategoryLinks(
    links: { nominationId: string; categoryIds: string[] }[],
    transaction: Transaction,
  ): Promise<void> {
    const rows = links.flatMap(({ nominationId, categoryIds }) =>
      [...new Set(categoryIds)].map((categoryId) => ({
        nominationId,
        categoryId,
      })),
    );
    if (rows.length === 0) return;
    await bulkCreateChunked(
      this.nominationCategoryModel,
      rows as CreationAttributes<NominationCategory>[],
      transaction,
    );
  }

  /**
   * Номінації конкурсу, що несуть УСІ перелічені осі (те, що раніше робив
   * `@>` по масиву). Підзапит іде по індексу `nomination_categories`.
   */
  private withAllCategories(ids: string[]): Record<string, unknown> {
    const list = this.uuidList(ids);
    if (list.length === 0) return {};
    return {
      id: {
        [Op.in]: literal(
          `(SELECT "nominationId" FROM nomination_categories
              WHERE "categoryId" IN (${list.join(', ')})
              GROUP BY "nominationId"
             HAVING COUNT(DISTINCT "categoryId") = ${list.length})`,
        ),
      },
    };
  }

  /** Номінації, що несуть ХОЧА Б ОДНУ з осей (колишній `&&`). */
  private withAnyCategory(ids: string[]): Record<string, unknown> {
    const list = this.uuidList(ids);
    if (list.length === 0) return {};
    return { id: { [Op.in]: literal(this.linkSubquery(list)) } };
  }

  /** Номінації, що не несуть жодної з осей. */
  private withoutAnyCategory(ids: string[]): Record<string, unknown> {
    const list = this.uuidList(ids);
    if (list.length === 0) return {};
    return { id: { [Op.notIn]: literal(this.linkSubquery(list)) } };
  }

  private linkSubquery(quotedIds: string[]): string {
    return `(SELECT "nominationId" FROM nomination_categories
               WHERE "categoryId" IN (${quotedIds.join(', ')}))`;
  }

  // Підзапит збирається рядком, тож у нього потрапляють лише значення, що є
  // валідними uuid — усе інше відкидається, а не екранується.
  private uuidList(ids: string[]): string[] {
    return [...new Set(ids)].filter((id) => isUUID(id)).map((id) => `'${id}'`);
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
    await this.loadCategories([nomination]);
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
    await this.loadCategories([nomination]);
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
      specialName: nomination.specialName,
      exitMode: nomination.exitMode,
      durationLimitSeconds: nomination.durationLimitSeconds,
      durationOverridden: nomination.durationOverridden,
      programLimits: nomination.programLimits ?? {},
      programs: this.programsFor(nomination, categories),
      leagues: this.categoriesFor(nomination, categories, 'level').map(
        (c) => c.name,
      ),
      lineups: this.categoriesFor(nomination, categories, 'lineup').map(
        (c) => ({ name: c.name, rangeFrom: c.rangeFrom, rangeTo: c.rangeTo }),
      ),
      ageCategories: this.categoriesFor(nomination, categories, 'age').map(
        (c) => ({ name: c.name, rangeFrom: c.rangeFrom, rangeTo: c.rangeTo }),
      ),
      exits: this.exitsOf(nomination, categories),
      createdAt: nomination.createdAt,
    };
  }
}
