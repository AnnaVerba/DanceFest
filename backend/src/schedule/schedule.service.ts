import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import {
  col,
  CreationAttributes,
  fn,
  type Includeable,
  Op,
  type Order,
  Transaction,
  UniqueConstraintError,
} from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { AccessLevel } from '../auth/access-level.enum';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';
import { Entry } from '../entries/entry.model';
import { Nomination } from '../nominations/nomination.model';
import { Venue } from '../venues/venue.model';
import { CompetitionRule } from '../competition-rules/competition-rule.model';
import { CompetitionRulesService } from '../competition-rules/competition-rules.service';
import { DEFAULT_DURATION_ROUND } from '../competition-rules/duration-limit.model';
import { UsersService } from '../users/users.service';
import { CompetitionParticipantNumbersService } from '../competition-participant-numbers/competition-participant-numbers.service';
import { CompetitionDay } from './competition-day.model';
import { Section } from './section.model';
import type { ExitRun } from './exit-run';
import { SectionItem } from './section-item.model';
import { AWARD_ITEM, PERFORMANCE_ITEM, isManualRow } from './section-item-type';
import { performanceDuration } from './performance-duration';
import { eachDateInclusive } from './date-range';
import {
  buildSectionView,
  isGroupImprov,
  type ParticipantNumbersByEntry,
  type SectionSummaryView,
  type SectionView,
} from './section-view';
import {
  buildExtendedProgram,
  buildMineProgram,
  buildPublicProgram,
  type ExtendedProgramSection,
  type MineProgram,
  type PublicProgramRow,
} from './program-view';
import {
  paginateByRows,
  resolvePage,
  type PagedResult,
  type RowPaged,
} from './pagination';
import {
  DEFAULT_LIMIT_SECONDS,
  DEFAULT_PROGRAM_PAGE_ROWS,
  DEFAULT_SECTIONS_PAGE_ROWS,
  DEFAULT_UNASSIGNED_PAGE_SIZE,
  MAX_COMPETITION_DAYS,
  MAX_PROGRAM_PAGE_ROWS,
  MAX_SECTIONS_PAGE_ROWS,
  MAX_UNASSIGNED_PAGE_SIZE,
  PERSIST_ORDER_SQL,
} from './schedule.constants';
import {
  DAY_HAS_SECTIONS_MESSAGE,
  DAY_NOT_FOUND_MESSAGE,
  EXITS_ALREADY_ASSIGNED_MESSAGE,
  EXIT_NOT_IN_SCHEDULE_MESSAGE,
  EXTENDED_PROGRAM_FORBIDDEN_MESSAGE,
  ITEM_SET_MISMATCH_MESSAGE,
  MERGE_NEEDS_TWO_GROUPS_MESSAGE,
  MIXED_VENUE_SECTION_MESSAGE,
  NO_ENTRIES_FOR_SECTION_MESSAGE,
  NOMINATION_NOT_IN_SCHEDULE_MESSAGE,
  OTHER_VENUE_SECTION_MESSAGE,
  ROW_NOT_FOUND_MESSAGE,
  ROW_NOT_MANUAL_MESSAGE,
  SECTION_NOT_FOUND_MESSAGE,
  SECTION_SET_MISMATCH_MESSAGE,
} from './schedule.constants';
import { AddExitsDto } from './dto/add-exits.dto';
import { AddRowDto } from './dto/add-row.dto';
import { BuildSectionDto } from './dto/build-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { UpdateRowDto } from './dto/update-row.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { MergeGroupsDto } from './dto/merge-groups.dto';
import { MoveExitDto } from './dto/move-exit.dto';
import { MoveNominationDto } from './dto/move-nomination.dto';
import { RenameGroupDto } from './dto/rename-group.dto';
import { findVenueConflicts } from './find-venue-conflicts';
import type { VenueConflictView } from './venue-conflict';
import { RecalculateScheduleDto } from './dto/recalculate-schedule.dto';
import { ReorderSectionDto } from './dto/reorder-section.dto';

export interface UnassignedFilter {
  league?: string;
  ageCategory?: string;
  nominationId?: string;
}

export interface UnassignedExitView {
  id: string;
  number: number;
  nomination: string;
  nominationId: string | null;
  routineName: string;
  ageCategory: string | null;
  league: string | null;
  lineup: string | null;
  improv: boolean;
  participantsCount: number | null;
  studioName: string | null;
  // The venue of the exit's nomination, so the pool shows where it runs.
  venueId: string | null;
}

const ITEMS_ORDER: [string, 'ASC'][] = [['sortOrder', 'ASC']];

// The joins sectionOrder sorts by — the day's date and the venue's rank.
const SECTION_ORDER_INCLUDES: Includeable[] = [
  { model: CompetitionDay, as: 'day' },
  { model: Venue, as: 'venue', attributes: [] },
];

// Section views show each exit's venue, which lives on its nomination.
const ENTRY_WITH_NOMINATION_VENUE: Includeable = {
  model: Entry,
  include: [{ model: Nomination, attributes: ['id', 'venueId'] }],
};

@Injectable()
export class ScheduleService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(CompetitionDay)
    private readonly dayModel: typeof CompetitionDay,
    @InjectModel(Section)
    private readonly sectionModel: typeof Section,
    @InjectModel(SectionItem)
    private readonly itemModel: typeof SectionItem,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    private readonly rulesService: CompetitionRulesService,
    private readonly usersService: UsersService,
    private readonly participantNumbersService: CompetitionParticipantNumbersService,
  ) {}

  // --- Days -----------------------------------------------------------------

  async listDays(competitionId: string): Promise<CompetitionDay[]> {
    const competition = await this.assertCompetition(competitionId);
    const dates = eachDateInclusive(
      competition.dateFrom,
      competition.dateTo,
    ).slice(0, MAX_COMPETITION_DAYS);

    const existing = await this.dayModel.findAll({
      where: { competitionId },
    });
    const known = new Set(existing.map((day) => day.date));
    const missing = dates.filter((date) => !known.has(date));
    if (missing.length > 0) {
      await this.dayModel.bulkCreate(
        missing.map(
          (date) =>
            ({ competitionId, date }) as CreationAttributes<CompetitionDay>,
        ),
        { ignoreDuplicates: true },
      );
    }

    return this.dayModel.findAll({
      where: { competitionId },
      order: [['date', 'ASC']],
    });
  }

  async deleteDay(
    competitionId: string,
    dayId: string,
    requester: AuthenticatedUser,
  ): Promise<void> {
    await this.assertAccess(competitionId, requester);
    const day = await this.dayModel.findOne({
      where: { id: dayId, competitionId },
    });
    if (!day) {
      throw new NotFoundException(DAY_NOT_FOUND_MESSAGE);
    }
    const sectionCount = await this.sectionModel.count({
      where: { dayId },
    });
    if (sectionCount > 0) {
      throw new ConflictException(DAY_HAS_SECTIONS_MESSAGE);
    }
    await day.destroy();
  }

  // --- Sections read ------------------------------------------------------

  // Every venue runs its own program per day: a section belongs to one venue
  // (sections.venueId, taken from its exits' nominations when it is built),
  // so a venue filter is a plain column match.
  private sectionWhere(
    competitionId: string,
    filter: { dayId?: string; venueId?: string },
  ): Record<string, unknown> {
    const where: Record<string, unknown> = { competitionId };
    if (filter.dayId) where.dayId = filter.dayId;
    if (filter.venueId) where.venueId = filter.venueId;
    return where;
  }

  // Day, then one venue's program after another (venues in the order the
  // venue list shows them, sections without a venue last), then the
  // section's place in its venue's day. Needs SECTION_ORDER_INCLUDES.
  private readonly sectionOrder: Order = [
    [{ model: CompetitionDay, as: 'day' }, 'date', 'ASC'],
    [{ model: Venue, as: 'venue' }, 'createdAt', 'ASC NULLS LAST'],
    ['venueId', 'ASC'],
    ['sortOrder', 'ASC'],
  ];

  // entry id -> its per-competition participant numbers, loaded in one query
  // so buildSectionView can stay pure.
  private async participantNumbersByEntry(
    competitionId: string,
    items: SectionItem[],
  ): Promise<ParticipantNumbersByEntry> {
    const personIds = items.flatMap((i) => i.entry?.participantIds ?? []);
    const lookup = await this.participantNumbersService.loadLookup(
      [competitionId],
      personIds,
    );
    const byEntry: ParticipantNumbersByEntry = new Map();
    for (const item of items) {
      const entry = item.entry;
      if (!entry) continue;
      byEntry.set(
        entry.id,
        lookup.numbersFor(competitionId, entry.participantIds ?? []),
      );
    }
    return byEntry;
  }

  // Loads the items for the given sections in one query (the public /program
  // route is unauthenticated, so an N+1 here is a scraper's lever) and folds
  // each section into its API shape.
  private async toSectionViews(sections: Section[]): Promise<SectionView[]> {
    if (sections.length === 0) return [];
    const competitionId = sections[0].competitionId;
    const items = await this.itemModel.findAll({
      where: { sectionId: { [Op.in]: sections.map((s) => s.id) } },
      order: [
        ['sectionId', 'ASC'],
        ['sortOrder', 'ASC'],
      ],
      include: [ENTRY_WITH_NOMINATION_VENUE],
    });
    const numbers = await this.participantNumbersByEntry(competitionId, items);
    const bySection = new Map<string, SectionItem[]>();
    for (const item of items) {
      const bucket = bySection.get(item.sectionId);
      if (bucket) bucket.push(item);
      else bySection.set(item.sectionId, [item]);
    }
    return sections.map((section) =>
      buildSectionView(section, bySection.get(section.id) ?? [], numbers),
    );
  }

  // Unpaginated read — used by the program projections, which need
  // the whole schedule to compute running times end to end.
  async listSections(
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ): Promise<SectionView[]> {
    await this.assertCompetition(competitionId);
    const sections = await this.sectionModel.findAll({
      where: this.sectionWhere(competitionId, filter),
      include: SECTION_ORDER_INCLUDES,
      order: this.sectionOrder,
    });
    return this.toSectionViews(sections);
  }

  // Row-bounded, section-aligned pagination: a page holds whole sections
  // until their combined running-order length reaches `pageSize` rows, so a
  // day of 500 exits never lands in one response. The editor and the public
  // program share this and bring their own row targets.
  async listSectionsPage(
    competitionId: string,
    filter: { dayId?: string; venueId?: string },
    rawPage: string | undefined,
    rawPageSize: string | undefined,
    defaultPageRows = DEFAULT_SECTIONS_PAGE_ROWS,
    maxPageRows = MAX_SECTIONS_PAGE_ROWS,
  ): Promise<RowPaged<SectionView>> {
    await this.assertCompetition(competitionId);
    const { page, pageSize: targetRows } = resolvePage(
      rawPage,
      rawPageSize,
      defaultPageRows,
      maxPageRows,
    );

    const ordered = await this.sectionModel.findAll({
      where: this.sectionWhere(competitionId, filter),
      include: SECTION_ORDER_INCLUDES,
      order: this.sectionOrder,
      attributes: ['id'],
    });
    const orderedIds = ordered.map((s) => s.id);
    if (orderedIds.length === 0) {
      return {
        rows: [],
        totalSections: 0,
        pageCount: 0,
        page: 0,
        rangeStart: 0,
        rangeEnd: 0,
      };
    }

    const counts = (await this.itemModel.findAll({
      where: { sectionId: { [Op.in]: orderedIds } },
      attributes: ['sectionId', [fn('COUNT', col('id')), 'n']],
      group: ['sectionId'],
      raw: true,
    })) as unknown as { sectionId: string; n: string }[];
    const rowsBySection = new Map(
      counts.map((c) => [c.sectionId, Number(c.n)]),
    );

    const pages = paginateByRows(orderedIds, rowsBySection, targetRows);
    const current = Math.min(Math.max(page, 0), pages.length - 1);
    const pageIds = pages[current];
    const sectionsBefore = pages
      .slice(0, current)
      .reduce((sum, ids) => sum + ids.length, 0);

    const loaded = await this.sectionModel.findAll({
      where: { id: { [Op.in]: pageIds } },
      include: [{ model: CompetitionDay, as: 'day' }],
    });
    const byId = new Map(loaded.map((section) => [section.id, section]));
    const sections = pageIds.map((id) => byId.get(id)!);

    return {
      rows: await this.toSectionViews(sections),
      totalSections: orderedIds.length,
      pageCount: pages.length,
      page: current,
      rangeStart: sectionsBefore + 1,
      rangeEnd: sectionsBefore + pageIds.length,
    };
  }

  // Every section in scope, without items — for the move-exit menu, the
  // add-to-section picker and the section reorder, which a single page
  // cannot satisfy.
  async sectionsSummary(
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ): Promise<SectionSummaryView[]> {
    await this.assertCompetition(competitionId);
    const sections = await this.sectionModel.findAll({
      where: this.sectionWhere(competitionId, filter),
      include: SECTION_ORDER_INCLUDES,
      order: this.sectionOrder,
      attributes: ['id', 'name', 'dayId', 'venueId', 'sortOrder'],
    });
    return sections.map((s) => ({
      id: s.id,
      name: s.name,
      dayId: s.dayId,
      venueId: s.venueId,
      sortOrder: s.sortOrder,
    }));
  }

  // Day-wide counters for the editor header — the paged section list only
  // ever holds one screenful, so these can't be summed on the client.
  async sectionsStats(
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ): Promise<{
    performances: number;
    noMusic: number;
    endTime: string | null;
  }> {
    await this.assertCompetition(competitionId);
    const sections = await this.sectionModel.findAll({
      where: this.sectionWhere(competitionId, filter),
      include: SECTION_ORDER_INCLUDES,
      order: this.sectionOrder,
      attributes: ['id'],
    });
    if (sections.length === 0) {
      return { performances: 0, noMusic: 0, endTime: null };
    }
    const sectionIds = sections.map((s) => s.id);
    const performanceWhere: Record<string, unknown> = {
      sectionId: { [Op.in]: sectionIds },
      type: PERFORMANCE_ITEM,
    };

    const performances = await this.itemModel.count({
      where: performanceWhere,
    });
    const noMusic = await this.itemModel.count({
      where: performanceWhere,
      include: [
        {
          model: Entry,
          required: true,
          attributes: [],
          where: { [Op.or]: [{ musicName: null }, { musicName: '' }] },
        },
      ],
    });

    const lastSection = await this.sectionModel.findByPk(
      sectionIds[sectionIds.length - 1],
    );
    const lastView = lastSection ? await this.viewOf(lastSection) : null;
    const endTime = lastView?.items[lastView.items.length - 1]?.time ?? null;

    return { performances, noMusic, endTime };
  }

  // --- Build -------------------------------------------------------------

  async buildSection(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: BuildSectionDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    await this.assertDay(competitionId, dto.dayId);

    const entries = await this.loadSectionEntries(competitionId, dto.entryIds);
    const venueId = this.venueOf(entries);
    await this.assertNoneAssigned(competitionId, dto.entryIds);

    const rules = await this.rulesService.getRules(competitionId);
    const grouped = this.groupByNomination(entries);

    // Resolve every duration up front: durationOf hits the rules service and
    // can throw, so it must not run mid-insert and leave a half-built section.
    const limitCache = new Map<string, number>();
    const performanceRows: CreationAttributes<SectionItem>[] = [];
    for (const group of grouped) {
      for (const entry of group.entries) {
        performanceRows.push({
          entryId: entry.id,
          type: PERFORMANCE_ITEM,
          nominationGroupKey: group.key,
          durationSeconds: await this.durationOf(entry, rules, limitCache),
          sortOrder: performanceRows.length,
        } as CreationAttributes<SectionItem>);
      }
    }

    try {
      return await this.sectionModel.sequelize!.transaction(
        async (transaction) => {
          // Each venue's day program keeps its own section order.
          const sortOrder = await this.sectionModel.count({
            where: { dayId: dto.dayId, venueId },
            transaction,
          });
          const section = await this.sectionModel.create(
            {
              competitionId,
              dayId: dto.dayId,
              venueId,
              name: dto.name.trim(),
              startTime: dto.startTime,
              pauseSeconds: rules.pauseSeconds,
              sortOrder,
            } as CreationAttributes<Section>,
            { transaction },
          );

          await this.itemModel.bulkCreate(
            performanceRows.map((row) => ({
              ...row,
              sectionId: section.id,
            })),
            { transaction },
          );
          await this.itemModel.create(
            {
              sectionId: section.id,
              entryId: null,
              type: AWARD_ITEM,
              sortOrder: performanceRows.length,
            } as CreationAttributes<SectionItem>,
            { transaction },
          );

          return this.viewOf(section, transaction);
        },
      );
    } catch (err) {
      // The partial-unique index on entryId is the real guard against a
      // concurrent build claiming the same exits — surface it as a 409.
      if (err instanceof UniqueConstraintError) {
        throw new ConflictException(EXITS_ALREADY_ASSIGNED_MESSAGE);
      }
      throw err;
    }
  }

  // Puts unassigned exits into an already formed section: an exit whose
  // nomination is there joins the end of that block, a new nomination opens
  // a block after the last performance. The rest of the order stays as is.
  async addExits(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    dto: AddExitsDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    const entries = await this.loadSectionEntries(competitionId, dto.entryIds);
    this.assertSectionVenue(section, entries);
    await this.assertNoneAssigned(competitionId, dto.entryIds);

    // Durations resolve before the transaction, as in buildSection.
    const rules = await this.rulesService.getRules(competitionId);
    const limitCache = new Map<string, number>();
    const groups: { key: string; rows: CreationAttributes<SectionItem>[] }[] =
      [];
    for (const group of this.groupByNomination(entries)) {
      groups.push({
        key: group.key,
        rows: await this.exitRows(group.key, group.entries, rules, limitCache),
      });
    }

    try {
      await this.sectionModel.sequelize!.transaction(async (transaction) => {
        // Same lock as late-entry placement, which may target this section.
        await this.competitionModel.findByPk(competitionId, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        const items = await this.itemModel.findAll({
          where: { sectionId, type: PERFORMANCE_ITEM },
          order: ITEMS_ORDER,
          transaction,
        });
        const blockEnds = new Map<string, SectionItem>();
        for (const item of items) {
          if (item.nominationGroupKey) {
            blockEnds.set(item.nominationGroupKey, item);
          }
        }
        const lastPerformance = items[items.length - 1]?.sortOrder ?? -1;

        const runs: ExitRun[] = [];
        const opening: CreationAttributes<SectionItem>[] = [];
        for (const group of groups) {
          const blockEnd = blockEnds.get(group.key);
          if (!blockEnd) {
            opening.push(...group.rows);
            continue;
          }
          runs.push({
            sectionId,
            afterSortOrder: blockEnd.sortOrder,
            opensBlocks: false,
            mergedGroupLabel: blockEnd.mergedGroupLabel,
            rows: group.rows,
          });
        }
        if (opening.length > 0) {
          runs.push({
            sectionId,
            afterSortOrder: lastPerformance,
            opensBlocks: true,
            mergedGroupLabel: null,
            rows: opening,
          });
        }
        await this.insertRuns(runs, transaction);
      });
    } catch (err) {
      // The partial-unique index on entryId catches a concurrent claim.
      if (err instanceof UniqueConstraintError) {
        throw new ConflictException(EXITS_ALREADY_ASSIGNED_MESSAGE);
      }
      throw err;
    }
    return this.viewOf(section);
  }

  async updateSection(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    if (dto.name !== undefined) section.name = dto.name.trim();
    if (dto.startTime !== undefined) section.startTime = dto.startTime;
    await section.save();
    return this.viewOf(section);
  }

  async deleteSection(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
  ): Promise<void> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    await section.destroy();
  }

  // Order the «Початок відділення» rows of one day.
  async reorderSections(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: ReorderSectionsDto,
  ): Promise<{ sections: SectionView[] }> {
    await this.assertAccess(competitionId, requester);
    await this.assertDay(competitionId, dto.dayId);

    const daySections = await this.sectionModel.findAll({
      where: { competitionId, dayId: dto.dayId, venueId: dto.venueId ?? null },
      attributes: ['id'],
    });
    const current = new Set(daySections.map((s) => s.id));
    const next = new Set(dto.sectionIds);
    if (
      current.size !== next.size ||
      [...current].some((id) => !next.has(id))
    ) {
      throw new BadRequestException(SECTION_SET_MISMATCH_MESSAGE);
    }

    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      for (const [index, id] of dto.sectionIds.entries()) {
        await this.sectionModel.update(
          { sortOrder: index },
          { where: { id }, transaction },
        );
      }
    });
    return {
      sections: await this.listSections(competitionId, { dayId: dto.dayId }),
    };
  }

  // --- Reorder / move / merge ------------------------------------------

  async reorderSection(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    dto: ReorderSectionDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    const items = await this.itemModel.findAll({
      where: { sectionId },
      order: ITEMS_ORDER,
    });

    const currentIds = new Set(items.map((i) => i.id));
    const nextIds = new Set(dto.itemIds);
    if (
      currentIds.size !== nextIds.size ||
      [...currentIds].some((id) => !nextIds.has(id))
    ) {
      throw new BadRequestException(ITEM_SET_MISMATCH_MESSAGE);
    }

    const awardIds = new Set(
      items.filter((i) => i.type === AWARD_ITEM).map((i) => i.id),
    );
    const ordered = [
      ...dto.itemIds.filter((id) => !awardIds.has(id)),
      ...dto.itemIds.filter((id) => awardIds.has(id)),
    ];
    await this.sectionModel.sequelize!.transaction((transaction) =>
      this.persistOrder(ordered, transaction),
    );
    return this.viewOf(section);
  }

  async moveExit(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: MoveExitDto,
  ): Promise<{ sections: SectionView[] }> {
    await this.assertAccess(competitionId, requester);
    const sectionIds = await this.competitionSectionIds(competitionId);

    const item = await this.itemModel.findOne({
      where: {
        entryId: dto.entryId,
        type: PERFORMANCE_ITEM,
        sectionId: { [Op.in]: sectionIds },
      },
    });
    if (!item) {
      throw new NotFoundException(EXIT_NOT_IN_SCHEDULE_MESSAGE);
    }
    const target = await this.assertSection(competitionId, dto.targetSectionId);
    this.assertSectionVenue(
      target,
      await this.loadSectionEntries(competitionId, [dto.entryId]),
    );
    const sourceId = item.sectionId;
    if (sourceId === target.id) {
      return { sections: [await this.sectionViewById(sourceId)] };
    }

    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      item.sectionId = target.id;
      item.sortOrder = await this.itemModel.count({
        where: { sectionId: target.id },
        transaction,
      });
      await item.save({ transaction });

      await this.normalize(sourceId, transaction);
      await this.normalize(target.id, transaction);
    });

    return {
      sections: [
        await this.sectionViewById(sourceId),
        await this.sectionViewById(target.id),
      ],
    };
  }

  // Moves a whole nomination — every exit of it in the program — into one
  // formed section of any day. A section on another venue moves the
  // nomination itself there: its venue changes with it, so no exit stays
  // behind on the old venue's program. Only the moved rows change place.
  async moveNomination(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: MoveNominationDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const target = await this.assertSection(competitionId, dto.targetSectionId);

    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      // Same lock as late-entry placement and add-exits.
      await this.competitionModel.findByPk(competitionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const moving = await this.groupRows(
        competitionId,
        dto.groupKey,
        transaction,
      );
      if (moving.length === 0) {
        throw new NotFoundException(NOMINATION_NOT_IN_SCHEDULE_MESSAGE);
      }
      await this.followTargetVenue(moving, target, transaction);
      await this.placeRows(moving, target, transaction);
    });
    return this.viewOf(target);
  }

  // A nomination moved to another venue (Майданчики tab, one or many at
  // once) leaves its old venue's program (TASK-14): its exits of each day
  // join the end of the new venue's last section that day, or go back to
  // the unassigned pool when that venue runs no section then. Exits already
  // on the new venue stay put.
  async relocateToVenue(
    competitionId: string,
    nominationIds: string[],
    venueId: string | null,
  ): Promise<void> {
    if (nominationIds.length === 0) return;
    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      await this.competitionModel.findByPk(competitionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const sections = await this.sectionModel.findAll({
        where: { competitionId },
        include: SECTION_ORDER_INCLUDES,
        order: this.sectionOrder,
        attributes: ['id', 'dayId', 'venueId'],
        transaction,
      });
      const sectionById = new Map(sections.map((s) => [s.id, s]));
      // Sections come in running order, so the last one per day wins.
      const lastOnVenue = new Map<string, Section>();
      for (const section of sections) {
        if (venueId && section.venueId === venueId) {
          lastOnVenue.set(section.dayId, section);
        }
      }

      for (const nominationId of nominationIds) {
        const rows = await this.groupRows(
          competitionId,
          nominationId,
          transaction,
        );
        const byDay = new Map<string, SectionItem[]>();
        for (const row of rows) {
          const section = sectionById.get(row.sectionId)!;
          if (section.venueId === venueId) continue;
          byDay.set(section.dayId, [...(byDay.get(section.dayId) ?? []), row]);
        }
        for (const [dayId, dayRows] of byDay) {
          const target = lastOnVenue.get(dayId);
          if (target) await this.placeRows(dayRows, target, transaction);
          else await this.unschedule(dayRows, transaction);
        }
      }
    });
  }

  // Puts `rows` (running order) into `target` as one block: where the
  // section already runs part of it, else after its last performance. Only
  // the moved rows change place; the sections they left close up.
  private async placeRows(
    moving: SectionItem[],
    target: Section,
    transaction: Transaction,
  ): Promise<void> {
    const movingIds = new Set(moving.map((row) => row.id));
    const targetItems = await this.itemModel.findAll({
      where: { sectionId: target.id },
      order: ITEMS_ORDER,
      transaction,
    });
    const kept = targetItems.filter((item) => !movingIds.has(item.id));
    // The block keeps its place when the section already runs part of
    // it; otherwise it follows the section's last performance.
    const ownFirst = targetItems.findIndex((item) => movingIds.has(item.id));
    const insertAt =
      ownFirst >= 0
        ? ownFirst
        : kept.findLastIndex((item) => item.type === PERFORMANCE_ITEM) + 1;
    // A merge label is per section: keep the target's, drop a source's.
    const mergedGroupLabel =
      ownFirst >= 0 ? targetItems[ownFirst].mergedGroupLabel : null;

    await this.itemModel.update(
      { sectionId: target.id, mergedGroupLabel },
      { where: { id: { [Op.in]: [...movingIds] } }, transaction },
    );
    const ids = kept.map((item) => item.id);
    ids.splice(insertAt, 0, ...moving.map((row) => row.id));
    await this.persistOrder(ids, transaction);

    const sources = new Set(moving.map((row) => row.sectionId));
    sources.delete(target.id);
    for (const sourceId of sources) {
      await this.normalize(sourceId, transaction);
    }
  }

  // Takes rows out of the program — their exits return to the pool.
  private async unschedule(
    rows: SectionItem[],
    transaction: Transaction,
  ): Promise<void> {
    await this.itemModel.destroy({
      where: { id: { [Op.in]: rows.map((row) => row.id) } },
      transaction,
    });
    for (const sectionId of new Set(rows.map((row) => row.sectionId))) {
      await this.normalize(sectionId, transaction);
    }
  }

  // Participants booked on two venues at overlapping times (TASK-14).
  async venueConflicts(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<VenueConflictView[]> {
    await this.assertAccess(competitionId, requester);
    return findVenueConflicts(await this.listSections(competitionId));
  }

  // Every performance row of one nomination group, in running order.
  private async groupRows(
    competitionId: string,
    groupKey: string,
    transaction: Transaction,
  ): Promise<SectionItem[]> {
    const position = await this.sectionPositions(competitionId, transaction);
    if (position.size === 0) return [];
    const rows = await this.itemModel.findAll({
      where: {
        sectionId: { [Op.in]: [...position.keys()] },
        type: PERFORMANCE_ITEM,
        nominationGroupKey: groupKey,
      },
      include: [{ model: Entry, attributes: ['id', 'nominationId'] }],
      transaction,
    });
    return rows.sort((a, b) => this.runningOrder(a, b, position));
  }

  // A nomination moved onto another venue's section now runs there.
  private async followTargetVenue(
    rows: SectionItem[],
    target: Section,
    transaction: Transaction,
  ): Promise<void> {
    if (!target.venueId) return;
    const nominationIds = [
      ...new Set(
        rows
          .map((row) => row.entry?.nominationId)
          .filter((id): id is string => id != null),
      ),
    ];
    if (nominationIds.length === 0) return;
    await this.nominationModel.update(
      { venueId: target.venueId },
      { where: { id: { [Op.in]: nominationIds } }, transaction },
    );
  }

  async mergeGroups(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    dto: MergeGroupsDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    if (new Set(dto.groupKeys).size < 2) {
      throw new BadRequestException(MERGE_NEEDS_TWO_GROUPS_MESSAGE);
    }
    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      await this.itemModel.update(
        { mergedGroupLabel: dto.label.trim() },
        {
          where: { sectionId, nominationGroupKey: { [Op.in]: dto.groupKeys } },
          transaction,
        },
      );
      // One block (TASK-15): the merged rows gather where the first of them
      // runs, each keeping its order; nothing else moves.
      const items = await this.itemModel.findAll({
        where: { sectionId },
        order: ITEMS_ORDER,
        transaction,
      });
      const keys = new Set(dto.groupKeys);
      const merged = items.filter(
        (item) =>
          item.nominationGroupKey !== null && keys.has(item.nominationGroupKey),
      );
      if (merged.length === 0) return;
      const mergedIds = new Set(merged.map((item) => item.id));
      const firstAt = items.findIndex((item) => mergedIds.has(item.id));
      const ids = items
        .filter((item) => !mergedIds.has(item.id))
        .map((item) => item.id);
      ids.splice(firstAt, 0, ...merged.map((item) => item.id));
      await this.persistOrder(ids, transaction);
    });
    return this.viewOf(section);
  }

  // Renames a merged block in place — every group sharing its label.
  async renameMergedGroup(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    groupKey: string,
    dto: RenameGroupDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    const label = await this.mergedLabelOf(sectionId, groupKey);
    if (label !== null) {
      await this.itemModel.update(
        { mergedGroupLabel: dto.label.trim() },
        { where: { sectionId, mergedGroupLabel: label } },
      );
    }
    return this.viewOf(section);
  }

  // The merged label a group carries in a section, null when not merged.
  private async mergedLabelOf(
    sectionId: string,
    groupKey: string,
  ): Promise<string | null> {
    const row = await this.itemModel.findOne({
      where: {
        sectionId,
        nominationGroupKey: groupKey,
        mergedGroupLabel: { [Op.ne]: null },
      },
      attributes: ['mergedGroupLabel'],
    });
    return row?.mergedGroupLabel ?? null;
  }

  async unmergeGroup(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    groupKey: string,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    // A merged block splits back as a whole — every group sharing its label.
    const label = await this.mergedLabelOf(sectionId, groupKey);
    if (label !== null) {
      await this.itemModel.update(
        { mergedGroupLabel: null },
        { where: { sectionId, mergedGroupLabel: label } },
      );
    }
    return this.viewOf(section);
  }

  // --- Manual rows (break, gala) -------------------------------------

  async addRow(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    dto: AddRowDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    const items = await this.itemModel.findAll({
      where: { sectionId },
      order: ITEMS_ORDER,
    });

    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      const created = await this.itemModel.create(
        {
          sectionId,
          entryId: null,
          type: dto.type,
          label: dto.label.trim(),
          durationSeconds: dto.durationSeconds,
          sortOrder: items.length,
        } as CreationAttributes<SectionItem>,
        { transaction },
      );

      const ids = items.map((i) => i.id);
      const awardIndex = items.findIndex((i) => i.type === AWARD_ITEM);
      let insertAt = awardIndex >= 0 ? awardIndex : ids.length;
      if (dto.afterItemId) {
        const idx = ids.indexOf(dto.afterItemId);
        if (idx >= 0) insertAt = idx + 1;
      }
      ids.splice(insertAt, 0, created.id);

      const awardIds = new Set(
        items.filter((i) => i.type === AWARD_ITEM).map((i) => i.id),
      );
      await this.persistOrder(
        [
          ...ids.filter((id) => !awardIds.has(id)),
          ...ids.filter((id) => awardIds.has(id)),
        ],
        transaction,
      );
    });
    return this.viewOf(section);
  }

  async updateRow(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    itemId: string,
    dto: UpdateRowDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    const item = await this.itemModel.findOne({
      where: { id: itemId, sectionId },
    });
    if (!item) {
      throw new NotFoundException(ROW_NOT_FOUND_MESSAGE);
    }
    if (!isManualRow(item.type)) {
      throw new BadRequestException(ROW_NOT_MANUAL_MESSAGE);
    }
    if (dto.label !== undefined) item.label = dto.label.trim();
    if (dto.durationSeconds !== undefined) {
      item.durationSeconds = dto.durationSeconds;
    }
    await item.save();
    return this.viewOf(section);
  }

  async deleteRow(
    competitionId: string,
    requester: AuthenticatedUser,
    sectionId: string,
    itemId: string,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requester);
    const section = await this.assertSection(competitionId, sectionId);
    const item = await this.itemModel.findOne({
      where: { id: itemId, sectionId },
    });
    if (!item) {
      throw new NotFoundException(ROW_NOT_FOUND_MESSAGE);
    }
    if (!isManualRow(item.type)) {
      throw new BadRequestException(ROW_NOT_MANUAL_MESSAGE);
    }
    await item.destroy();
    return this.viewOf(section);
  }

  // --- Explicit recalculation -----------------------------------------

  async recalculate(
    competitionId: string,
    requester: AuthenticatedUser,
    dto: RecalculateScheduleDto,
  ): Promise<{ sections: SectionView[] }> {
    await this.assertAccess(competitionId, requester);
    const rules = await this.rulesService.getRules(competitionId);

    const sections = dto.sectionId
      ? [await this.assertSection(competitionId, dto.sectionId)]
      : await this.sectionModel.findAll({
          where: { competitionId },
          order: [['sortOrder', 'ASC']],
        });

    // One transaction for every section: an unresolvable entry halfway
    // through must not leave the schedule split between old and new rules.
    const limitCache = new Map<string, number>();
    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      for (const section of sections) {
        await this.itemModel.destroy({
          where: {
            sectionId: section.id,
            type: PERFORMANCE_ITEM,
            entryId: null,
          },
          transaction,
        });
        const items = await this.itemModel.findAll({
          where: { sectionId: section.id, type: PERFORMANCE_ITEM },
          include: [{ model: Entry }],
          transaction,
        });
        for (const item of items) {
          if (!item.entry) continue;
          item.durationSeconds = await this.durationOf(
            item.entry,
            rules,
            limitCache,
          );
          await item.save({ transaction });
        }
        section.pauseSeconds = rules.pauseSeconds;
        await section.save({ transaction });
      }
    });

    return {
      sections: await Promise.all(sections.map((s) => this.viewOf(s))),
    };
  }

  // --- Late entries -----------------------------------------------------

  // An entry submitted after the program was formed joins the end of its
  // nomination's block when that block is already scheduled (BUG-13). Only
  // the rows below the insertion point shift down — the formed order is
  // never rebuilt — and their times follow on read. An entry whose
  // nomination has no block yet stays in the unassigned pool.
  async appendToScheduledBlocks(
    competitionId: string,
    entries: Entry[],
  ): Promise<void> {
    if (entries.length === 0) return;
    const rules = await this.rulesService.getRules(competitionId);
    const limitCache = new Map<string, number>();

    await this.sectionModel.sequelize!.transaction(async (transaction) => {
      // Serializes concurrent submissions of one competition, so two late
      // entries of the same block never read the same tail position.
      await this.competitionModel.findByPk(competitionId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const blockEnds = await this.lastBlockRows(
        competitionId,
        entries.map((entry) => this.nominationGroupKeyOf(entry)),
        transaction,
      );
      const runs: ExitRun[] = [];
      for (const group of this.groupByNomination(entries)) {
        const blockEnd = blockEnds.get(group.key);
        if (!blockEnd) continue;
        runs.push({
          sectionId: blockEnd.sectionId,
          afterSortOrder: blockEnd.sortOrder,
          opensBlocks: false,
          mergedGroupLabel: blockEnd.mergedGroupLabel,
          rows: await this.exitRows(
            group.key,
            group.entries,
            rules,
            limitCache,
          ),
        });
      }
      await this.insertRuns(runs, transaction);
    });
  }

  // nomination group key -> its block's last performance row in running
  // order (latest section, then latest position). A block split across
  // sections by move-exit grows in the section it ends in.
  private async lastBlockRows(
    competitionId: string,
    groupKeys: string[],
    transaction: Transaction,
  ): Promise<Map<string, SectionItem>> {
    const position = await this.sectionPositions(competitionId, transaction);
    const blockEnds = new Map<string, SectionItem>();
    if (position.size === 0) return blockEnds;

    const rows = await this.itemModel.findAll({
      where: {
        sectionId: { [Op.in]: [...position.keys()] },
        type: PERFORMANCE_ITEM,
        nominationGroupKey: { [Op.in]: [...new Set(groupKeys)] },
      },
      transaction,
    });
    for (const row of rows) {
      const key = row.nominationGroupKey as string;
      const current = blockEnds.get(key);
      if (!current || this.runningOrder(row, current, position) > 0) {
        blockEnds.set(key, row);
      }
    }
    return blockEnds;
  }

  // section id -> its place in the whole program's running order.
  private async sectionPositions(
    competitionId: string,
    transaction: Transaction,
  ): Promise<Map<string, number>> {
    const sections = await this.sectionModel.findAll({
      where: { competitionId },
      include: SECTION_ORDER_INCLUDES,
      order: this.sectionOrder,
      attributes: ['id'],
      transaction,
    });
    return new Map(sections.map((section, i) => [section.id, i]));
  }

  // Compares two rows by running order: their sections' places, then their
  // own positions. Negative when `a` runs first.
  private runningOrder(
    a: SectionItem,
    b: SectionItem,
    position: Map<string, number>,
  ): number {
    return (
      position.get(a.sectionId)! - position.get(b.sectionId)! ||
      a.sortOrder - b.sortOrder
    );
  }

  // Performance rows for one nomination group, in the group's order; the
  // section, position and merged label come from the run they go into.
  private async exitRows(
    groupKey: string,
    entries: Entry[],
    rules: CompetitionRule,
    limitCache: Map<string, number>,
  ): Promise<CreationAttributes<SectionItem>[]> {
    const rows: CreationAttributes<SectionItem>[] = [];
    for (const entry of entries) {
      rows.push({
        entryId: entry.id,
        type: PERFORMANCE_ITEM,
        nominationGroupKey: groupKey,
        durationSeconds: await this.durationOf(entry, rules, limitCache),
      } as CreationAttributes<SectionItem>);
    }
    return rows;
  }

  // Each run costs one shift of the rows below it plus one insert, instead
  // of rewriting the whole section — the (sectionId, sortOrder) index is not
  // unique, and gaps left by a deleted row keep the order intact. Runs go
  // bottom-up, so a shift never moves an anchor a later run still relies on.
  private async insertRuns(
    runs: ExitRun[],
    transaction: Transaction,
  ): Promise<void> {
    const bottomUp = [...runs].sort(
      (a, b) =>
        b.afterSortOrder - a.afterSortOrder ||
        Number(b.opensBlocks) - Number(a.opensBlocks),
    );
    for (const run of bottomUp) {
      await this.itemModel.increment('sortOrder', {
        by: run.rows.length,
        where: {
          sectionId: run.sectionId,
          sortOrder: { [Op.gt]: run.afterSortOrder },
        },
        transaction,
      });
      await this.itemModel.bulkCreate(
        run.rows.map((row, index) => ({
          ...row,
          sectionId: run.sectionId,
          mergedGroupLabel: run.mergedGroupLabel,
          sortOrder: run.afterSortOrder + 1 + index,
        })),
        { transaction },
      );
    }
  }

  // --- Unassigned pool ------------------------------------------------

  private async unassignedWhere(
    competitionId: string,
    filter: UnassignedFilter,
  ): Promise<Record<string, unknown>> {
    const assigned = await this.assignedEntryIds(competitionId);
    const where: Record<string, unknown> = { competitionId };
    if (filter.league) where.league = filter.league;
    if (filter.ageCategory) where.ageCategory = filter.ageCategory;
    if (filter.nominationId) where.nominationId = filter.nominationId;
    if (assigned.length > 0) where.id = { [Op.notIn]: assigned };
    return where;
  }

  async listUnassigned(
    competitionId: string,
    requester: AuthenticatedUser,
    filter: UnassignedFilter,
    rawPage: string | undefined,
    rawPageSize: string | undefined,
  ): Promise<PagedResult<UnassignedExitView>> {
    await this.assertAccess(competitionId, requester);
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_UNASSIGNED_PAGE_SIZE,
      MAX_UNASSIGNED_PAGE_SIZE,
    );
    const where = await this.unassignedWhere(competitionId, filter);

    const { rows, count } = await this.entryModel.findAndCountAll({
      where,
      include: [{ model: Nomination, attributes: ['id', 'venueId'] }],
      order: [['number', 'ASC']],
      limit,
      offset,
    });
    return {
      rows: rows.map((entry) => ({
        id: entry.id,
        number: entry.number,
        nomination: entry.nomination,
        nominationId: entry.nominationId,
        routineName: entry.routineName,
        ageCategory: entry.ageCategory,
        league: entry.league,
        lineup: entry.lineup,
        improv: entry.improv,
        participantsCount: entry.participantsCount,
        studioName: entry.studioName,
        venueId: entry.nominationRef?.venueId ?? null,
      })),
      total: count,
      page,
      pageSize,
    };
  }

  // Distinct leagues / age categories among the still-unassigned exits —
  // fills the pool's filter dropdowns without shipping every row.
  async unassignedFacets(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<{ leagues: string[]; ageCategories: string[] }> {
    await this.assertAccess(competitionId, requester);
    const where = await this.unassignedWhere(competitionId, {});
    const rows = await this.entryModel.findAll({
      where,
      attributes: ['league', 'ageCategory'],
    });
    const leagues = new Set<string>();
    const ageCategories = new Set<string>();
    for (const row of rows) {
      if (row.league) leagues.add(row.league);
      if (row.ageCategory) ageCategories.add(row.ageCategory);
    }
    return {
      leagues: [...leagues].sort(),
      ageCategories: [...ageCategories].sort(),
    };
  }

  // Every unassigned exit id under the current filter — backs "select all"
  // when the list itself is paginated.
  async unassignedIds(
    competitionId: string,
    requester: AuthenticatedUser,
    filter: UnassignedFilter,
  ): Promise<string[]> {
    await this.assertAccess(competitionId, requester);
    const where = await this.unassignedWhere(competitionId, filter);
    const rows = await this.entryModel.findAll({
      where,
      attributes: ['id'],
      order: [['number', 'ASC']],
    });
    return rows.map((r) => r.id);
  }

  // --- Projections ---------------------------------------------------

  async publicProgram(
    competitionId: string,
    query: {
      dayId?: string;
      venueId?: string;
      page?: string;
      pageSize?: string;
    } = {},
  ): Promise<RowPaged<PublicProgramRow>> {
    const page = await this.listSectionsPage(
      competitionId,
      { dayId: query.dayId, venueId: query.venueId },
      query.page,
      query.pageSize,
      DEFAULT_PROGRAM_PAGE_ROWS,
      MAX_PROGRAM_PAGE_ROWS,
    );
    return { ...page, rows: buildPublicProgram(page.rows) };
  }

  async myProgram(competitionId: string, userId: string): Promise<MineProgram> {
    const sections = await this.listSections(competitionId);
    const roster = await this.usersService.listRosterByCoach(userId);
    return buildMineProgram(sections, {
      ownIds: [userId],
      studentIds: roster.map((r) => r.id),
    });
  }

  async extendedProgram(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<ExtendedProgramSection[]> {
    try {
      await this.assertAccess(competitionId, requester);
    } catch {
      throw new ForbiddenException(EXTENDED_PROGRAM_FORBIDDEN_MESSAGE);
    }
    const sections = await this.listSections(competitionId);
    return buildExtendedProgram(sections);
  }

  // --- internals ---------------------------------------------------

  private async viewOf(
    section: Section,
    transaction?: Transaction,
  ): Promise<SectionView> {
    const items = await this.itemModel.findAll({
      where: { sectionId: section.id },
      order: ITEMS_ORDER,
      include: [ENTRY_WITH_NOMINATION_VENUE],
      transaction,
    });
    const numbers = await this.participantNumbersByEntry(
      section.competitionId,
      items,
    );
    return buildSectionView(section, items, numbers);
  }

  private async sectionViewById(sectionId: string): Promise<SectionView> {
    const section = await this.sectionModel.findByPk(sectionId);
    if (!section) {
      throw new NotFoundException(SECTION_NOT_FOUND_MESSAGE);
    }
    return this.viewOf(section);
  }

  // The key a section groups an entry's exits under — also how a late entry
  // finds its nomination's block.
  private nominationGroupKeyOf(entry: Entry): string {
    return entry.nominationId ?? entry.nomination;
  }

  private groupByNomination(
    entries: Entry[],
  ): { key: string; entries: Entry[] }[] {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
      const key = this.nominationGroupKeyOf(entry);
      const bucket = groups.get(key) ?? [];
      bucket.push(entry);
      groups.set(key, bucket);
    }
    return [...groups.entries()]
      .map(([key, bucket]) => ({
        key,
        entries: [...bucket].sort((a, b) => a.number - b.number),
      }))
      .sort((a, b) => a.entries[0].number - b.entries[0].number);
  }

  // Priority for a non-improv exit's on-stage limit:
  //   league limit (the simple knob) → per-nomination / per-axis
  //   duration_limits → 180s default.
  // `limitCache` (nominationId -> seconds) is passed by callers that resolve
  // many entries in one pass — a section or a whole recalculate — where the
  // same nomination recurs and its limit cannot change mid-pass.
  private async durationOf(
    entry: Entry,
    rules: CompetitionRule,
    limitCache?: Map<string, number>,
  ): Promise<number> {
    // leagueLimits keys are stored trimmed (see sanitizeLeagueLimits).
    const leagueKey = entry.league?.trim();
    const leagueLimit = leagueKey ? rules.leagueLimits?.[leagueKey] : undefined;
    let limitSeconds: number;
    if (typeof leagueLimit === 'number' && leagueLimit > 0) {
      limitSeconds = leagueLimit;
    } else if (entry.nominationId) {
      const cached = limitCache?.get(entry.nominationId);
      if (cached !== undefined) {
        limitSeconds = cached;
      } else {
        limitSeconds = await this.rulesService.resolveLimit(
          entry.nominationId,
          DEFAULT_DURATION_ROUND,
        );
        limitCache?.set(entry.nominationId, limitSeconds);
      }
    } else {
      limitSeconds = DEFAULT_LIMIT_SECONDS;
    }
    return performanceDuration(
      {
        improv: entry.improv,
        isGroupImprov: isGroupImprov(entry),
        limitSeconds,
      },
      rules,
    );
  }

  private async persistOrder(
    orderedIds: string[],
    transaction?: Transaction,
  ): Promise<void> {
    // One UPDATE for the whole section instead of one per row — a
    // 100-row reorder used to cost 100 round trips.
    if (orderedIds.length === 0) return;
    await this.itemModel.sequelize!.query(PERSIST_ORDER_SQL, {
      bind: [orderedIds],
      transaction,
    });
  }

  private async normalize(
    sectionId: string,
    transaction?: Transaction,
  ): Promise<void> {
    const items = await this.itemModel.findAll({
      where: { sectionId },
      order: ITEMS_ORDER,
      transaction,
    });
    const ordered = [
      ...items.filter((i) => i.type !== AWARD_ITEM).map((i) => i.id),
      ...items.filter((i) => i.type === AWARD_ITEM).map((i) => i.id),
    ];
    await this.persistOrder(ordered, transaction);
  }

  async assignedEntryIds(competitionId: string): Promise<string[]> {
    const sectionIds = await this.competitionSectionIds(competitionId);
    if (sectionIds.length === 0) return [];
    const items = await this.itemModel.findAll({
      where: {
        sectionId: { [Op.in]: sectionIds },
        type: PERFORMANCE_ITEM,
        entryId: { [Op.ne]: null },
      },
      attributes: ['entryId'],
    });
    return items.map((i) => i.entryId as string);
  }

  // The exits a section is built from or extended with — every one must be
  // an entry of this competition.
  private async loadSectionEntries(
    competitionId: string,
    entryIds: string[],
  ): Promise<Entry[]> {
    if (entryIds.length === 0) {
      throw new BadRequestException(NO_ENTRIES_FOR_SECTION_MESSAGE);
    }
    const entries = await this.entryModel.findAll({
      where: { id: { [Op.in]: entryIds }, competitionId },
      include: [{ model: Nomination }],
    });
    if (entries.length !== new Set(entryIds).size) {
      throw new BadRequestException(NO_ENTRIES_FOR_SECTION_MESSAGE);
    }
    return entries;
  }

  // The one venue the exits' nominations share, null when none has one — a
  // section runs at one physical place and time, and its venue is taken
  // from the nominations (see BUG-19), never picked by hand.
  private venueOf(entries: Entry[]): string | null {
    const venues = new Set(
      entries
        .map((entry) => entry.nominationRef?.venueId)
        .filter((venueId): venueId is string => venueId != null),
    );
    if (venues.size > 1) {
      throw new BadRequestException(MIXED_VENUE_SECTION_MESSAGE);
    }
    return [...venues][0] ?? null;
  }

  // Exits join a formed section only on its own venue's program.
  private assertSectionVenue(section: Section, entries: Entry[]): void {
    const venueId = this.venueOf(entries);
    if (section.venueId && venueId && venueId !== section.venueId) {
      throw new BadRequestException(OTHER_VENUE_SECTION_MESSAGE);
    }
  }

  private async assertNoneAssigned(
    competitionId: string,
    entryIds: string[],
  ): Promise<void> {
    const sectionIds = await this.competitionSectionIds(competitionId);
    if (sectionIds.length === 0) return;
    const clashing = await this.itemModel.findAll({
      where: {
        sectionId: { [Op.in]: sectionIds },
        type: PERFORMANCE_ITEM,
        entryId: { [Op.in]: entryIds },
      },
      include: [{ model: Section }, { model: Entry }],
    });
    if (clashing.length > 0) {
      throw new ConflictException({
        message: EXITS_ALREADY_ASSIGNED_MESSAGE,
        assigned: clashing.map((i) => ({
          entryId: i.entryId,
          number: i.entry?.number ?? null,
          sectionName: i.section?.name ?? null,
        })),
      });
    }
  }

  private async competitionSectionIds(
    competitionId: string,
  ): Promise<string[]> {
    const sections = await this.sectionModel.findAll({
      where: { competitionId },
      attributes: ['id'],
    });
    return sections.map((s) => s.id);
  }

  private async assertCompetition(competitionId: string): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
    return competition;
  }

  private async assertAccess(
    competitionId: string,
    requester: AuthenticatedUser,
  ): Promise<Competition> {
    const competition = await this.assertCompetition(competitionId);
    // A global admin manages every competition's schedule.
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

  private async assertDay(
    competitionId: string,
    dayId: string,
  ): Promise<CompetitionDay> {
    const day = await this.dayModel.findOne({
      where: { id: dayId, competitionId },
    });
    if (!day) {
      throw new NotFoundException(DAY_NOT_FOUND_MESSAGE);
    }
    return day;
  }

  private async assertSection(
    competitionId: string,
    sectionId: string,
  ): Promise<Section> {
    const section = await this.sectionModel.findOne({
      where: { id: sectionId, competitionId },
    });
    if (!section) {
      throw new NotFoundException(SECTION_NOT_FOUND_MESSAGE);
    }
    return section;
  }
}
