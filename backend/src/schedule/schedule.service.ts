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
  Op,
  type Order,
  Transaction,
  UniqueConstraintError,
} from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import {
  COMPETITION_NOT_FOUND_MESSAGE,
  NO_COMPETITION_ACCESS_MESSAGE,
} from '../competitions/competitions.constants';
import { Entry } from '../entries/entry.model';
import { CompetitionRule } from '../competition-rules/competition-rule.model';
import { CompetitionRulesService } from '../competition-rules/competition-rules.service';
import { DEFAULT_DURATION_ROUND } from '../competition-rules/duration-limit.model';
import { UsersService } from '../users/users.service';
import { CompetitionParticipantNumbersService } from '../competition-participant-numbers/competition-participant-numbers.service';
import { CompetitionDay } from './competition-day.model';
import { Section } from './section.model';
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
  MAX_SCHEDULE_QUERY_ROWS,
  MAX_UNASSIGNED_PAGE_SIZE,
} from './schedule.constants';
import {
  DAY_HAS_SECTIONS_MESSAGE,
  DAY_NOT_FOUND_MESSAGE,
  EXITS_ALREADY_ASSIGNED_MESSAGE,
  EXIT_NOT_IN_SCHEDULE_MESSAGE,
  EXTENDED_PROGRAM_FORBIDDEN_MESSAGE,
  ITEM_SET_MISMATCH_MESSAGE,
  MERGE_NEEDS_TWO_GROUPS_MESSAGE,
  NO_ENTRIES_FOR_SECTION_MESSAGE,
  ROW_NOT_FOUND_MESSAGE,
  ROW_NOT_MANUAL_MESSAGE,
  SECTION_NOT_FOUND_MESSAGE,
  SECTION_SET_MISMATCH_MESSAGE,
} from './schedule.constants';
import { AddRowDto } from './dto/add-row.dto';
import { BuildSectionDto } from './dto/build-section.dto';
import { ReorderSectionsDto } from './dto/reorder-sections.dto';
import { UpdateRowDto } from './dto/update-row.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { MergeGroupsDto } from './dto/merge-groups.dto';
import { MoveExitDto } from './dto/move-exit.dto';
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
}

const ITEMS_ORDER: [string, 'ASC'][] = [['sortOrder', 'ASC']];

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
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
      limit: MAX_SCHEDULE_QUERY_ROWS,
    });
  }

  async deleteDay(
    competitionId: string,
    dayId: string,
    requesterId: string,
  ): Promise<void> {
    await this.assertAccess(competitionId, requesterId);
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

  private sectionWhere(filter: {
    dayId?: string;
    venueId?: string;
  }): Record<string, unknown> {
    const where: Record<string, unknown> = {};
    if (filter.dayId) where.dayId = filter.dayId;
    if (filter.venueId) where.venueId = filter.venueId;
    return where;
  }

  private readonly sectionOrder: Order = [
    [{ model: CompetitionDay, as: 'day' }, 'date', 'ASC'],
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
      include: [{ model: Entry }],
      limit: MAX_SCHEDULE_QUERY_ROWS,
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

  // Unpaginated (capped) read — used by the program projections, which need
  // the whole schedule to compute running times end to end.
  async listSections(
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ): Promise<SectionView[]> {
    await this.assertCompetition(competitionId);
    const sections = await this.sectionModel.findAll({
      where: { competitionId, ...this.sectionWhere(filter) },
      include: [{ model: CompetitionDay, as: 'day' }],
      order: this.sectionOrder,
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
      where: { competitionId, ...this.sectionWhere(filter) },
      include: [{ model: CompetitionDay, as: 'day' }],
      order: this.sectionOrder,
      attributes: ['id'],
      limit: MAX_SCHEDULE_QUERY_ROWS,
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

    const sections = await this.sectionModel.findAll({
      where: { id: { [Op.in]: pageIds } },
      include: [{ model: CompetitionDay, as: 'day' }],
      order: this.sectionOrder,
    });

    return {
      rows: await this.toSectionViews(sections),
      totalSections: orderedIds.length,
      pageCount: pages.length,
      page: current,
      rangeStart: sectionsBefore + 1,
      rangeEnd: sectionsBefore + pageIds.length,
    };
  }

  // Every section of the day, id + name only — for the move-exit menu and
  // the day-wide reorder, which a single page cannot satisfy.
  async sectionsSummary(
    competitionId: string,
    filter: { dayId?: string; venueId?: string } = {},
  ): Promise<SectionSummaryView[]> {
    await this.assertCompetition(competitionId);
    const sections = await this.sectionModel.findAll({
      where: { competitionId, ...this.sectionWhere(filter) },
      order: [['sortOrder', 'ASC']],
      attributes: ['id', 'name', 'dayId', 'venueId', 'sortOrder'],
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
      where: { competitionId, ...this.sectionWhere(filter) },
      include: [{ model: CompetitionDay, as: 'day' }],
      order: this.sectionOrder,
      attributes: ['id'],
      limit: MAX_SCHEDULE_QUERY_ROWS,
    });
    if (sections.length === 0) {
      return { performances: 0, noMusic: 0, endTime: null };
    }
    const sectionIds = sections.map((s) => s.id);

    const performances = await this.itemModel.count({
      where: { sectionId: { [Op.in]: sectionIds }, type: PERFORMANCE_ITEM },
    });
    const noMusic = await this.itemModel.count({
      where: { sectionId: { [Op.in]: sectionIds }, type: PERFORMANCE_ITEM },
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
    requesterId: string,
    dto: BuildSectionDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
    await this.assertDay(competitionId, dto.dayId);

    if (dto.entryIds.length === 0) {
      throw new BadRequestException(NO_ENTRIES_FOR_SECTION_MESSAGE);
    }

    const entries = await this.entryModel.findAll({
      where: { id: { [Op.in]: dto.entryIds }, competitionId },
      limit: MAX_SCHEDULE_QUERY_ROWS,
    });
    if (entries.length !== new Set(dto.entryIds).size) {
      throw new BadRequestException(NO_ENTRIES_FOR_SECTION_MESSAGE);
    }

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
          const sortOrder = await this.sectionModel.count({
            where: { dayId: dto.dayId },
            transaction,
          });
          const section = await this.sectionModel.create(
            {
              competitionId,
              dayId: dto.dayId,
              venueId: dto.venueId ?? null,
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

  async updateSection(
    competitionId: string,
    requesterId: string,
    sectionId: string,
    dto: UpdateSectionDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
    const section = await this.assertSection(competitionId, sectionId);
    if (dto.name !== undefined) section.name = dto.name.trim();
    if (dto.startTime !== undefined) section.startTime = dto.startTime;
    await section.save();
    return this.viewOf(section);
  }

  async deleteSection(
    competitionId: string,
    requesterId: string,
    sectionId: string,
  ): Promise<void> {
    await this.assertAccess(competitionId, requesterId);
    const section = await this.assertSection(competitionId, sectionId);
    await section.destroy();
  }

  // Order the «Початок відділення» rows of one day.
  async reorderSections(
    competitionId: string,
    requesterId: string,
    dto: ReorderSectionsDto,
  ): Promise<{ sections: SectionView[] }> {
    await this.assertAccess(competitionId, requesterId);
    await this.assertDay(competitionId, dto.dayId);

    const daySections = await this.sectionModel.findAll({
      where: { competitionId, dayId: dto.dayId },
      attributes: ['id'],
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
    requesterId: string,
    sectionId: string,
    dto: ReorderSectionDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
    const section = await this.assertSection(competitionId, sectionId);
    const items = await this.itemModel.findAll({
      where: { sectionId },
      order: ITEMS_ORDER,
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
    requesterId: string,
    dto: MoveExitDto,
  ): Promise<{ sections: SectionView[] }> {
    await this.assertAccess(competitionId, requesterId);
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

  async mergeGroups(
    competitionId: string,
    requesterId: string,
    sectionId: string,
    dto: MergeGroupsDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
    const section = await this.assertSection(competitionId, sectionId);
    if (new Set(dto.groupKeys).size < 2) {
      throw new BadRequestException(MERGE_NEEDS_TWO_GROUPS_MESSAGE);
    }
    await this.itemModel.update(
      { mergedGroupLabel: dto.label.trim() },
      { where: { sectionId, nominationGroupKey: { [Op.in]: dto.groupKeys } } },
    );
    return this.viewOf(section);
  }

  async unmergeGroup(
    competitionId: string,
    requesterId: string,
    sectionId: string,
    groupKey: string,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
    const section = await this.assertSection(competitionId, sectionId);
    await this.itemModel.update(
      { mergedGroupLabel: null },
      { where: { sectionId, nominationGroupKey: groupKey } },
    );
    return this.viewOf(section);
  }

  // --- Manual rows (break, gala) -------------------------------------

  async addRow(
    competitionId: string,
    requesterId: string,
    sectionId: string,
    dto: AddRowDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
    const section = await this.assertSection(competitionId, sectionId);
    const items = await this.itemModel.findAll({
      where: { sectionId },
      order: ITEMS_ORDER,
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
    requesterId: string,
    sectionId: string,
    itemId: string,
    dto: UpdateRowDto,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
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
    requesterId: string,
    sectionId: string,
    itemId: string,
  ): Promise<SectionView> {
    await this.assertAccess(competitionId, requesterId);
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
    requesterId: string,
    dto: RecalculateScheduleDto,
  ): Promise<{ sections: SectionView[] }> {
    await this.assertAccess(competitionId, requesterId);
    const rules = await this.rulesService.getRules(competitionId);

    const sections = dto.sectionId
      ? [await this.assertSection(competitionId, dto.sectionId)]
      : await this.sectionModel.findAll({
          where: { competitionId },
          order: [['sortOrder', 'ASC']],
          limit: MAX_SCHEDULE_QUERY_ROWS,
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
          limit: MAX_SCHEDULE_QUERY_ROWS,
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
    requesterId: string,
    filter: UnassignedFilter,
    rawPage: string | undefined,
    rawPageSize: string | undefined,
  ): Promise<PagedResult<UnassignedExitView>> {
    await this.assertAccess(competitionId, requesterId);
    const { page, pageSize, limit, offset } = resolvePage(
      rawPage,
      rawPageSize,
      DEFAULT_UNASSIGNED_PAGE_SIZE,
      MAX_UNASSIGNED_PAGE_SIZE,
    );
    const where = await this.unassignedWhere(competitionId, filter);

    const { rows, count } = await this.entryModel.findAndCountAll({
      where,
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
    requesterId: string,
  ): Promise<{ leagues: string[]; ageCategories: string[] }> {
    await this.assertAccess(competitionId, requesterId);
    const where = await this.unassignedWhere(competitionId, {});
    const rows = await this.entryModel.findAll({
      where,
      attributes: ['league', 'ageCategory'],
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
    requesterId: string,
    filter: UnassignedFilter,
  ): Promise<string[]> {
    await this.assertAccess(competitionId, requesterId);
    const where = await this.unassignedWhere(competitionId, filter);
    const rows = await this.entryModel.findAll({
      where,
      attributes: ['id'],
      order: [['number', 'ASC']],
      limit: MAX_SCHEDULE_QUERY_ROWS,
    });
    return rows.map((r) => r.id);
  }

  // --- Projections ---------------------------------------------------

  async publicProgram(
    competitionId: string,
    query: { dayId?: string; page?: string; pageSize?: string } = {},
  ): Promise<RowPaged<PublicProgramRow>> {
    const page = await this.listSectionsPage(
      competitionId,
      { dayId: query.dayId },
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
    requesterId: string,
  ): Promise<ExtendedProgramSection[]> {
    try {
      await this.assertAccess(competitionId, requesterId);
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
      include: [{ model: Entry }],
      limit: MAX_SCHEDULE_QUERY_ROWS,
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

  private groupByNomination(
    entries: Entry[],
  ): { key: string; entries: Entry[] }[] {
    const groups = new Map<string, Entry[]>();
    for (const entry of entries) {
      const key = entry.nominationId ?? entry.nomination;
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
    // Sequential, not Promise.all: a partial failure must leave sortOrder
    // untouched (the caller wraps this in a transaction), and parallel writes
    // on one transaction's connection are unsafe anyway.
    for (const [index, id] of orderedIds.entries()) {
      await this.itemModel.update(
        { sortOrder: index },
        { where: { id }, transaction },
      );
    }
  }

  private async normalize(
    sectionId: string,
    transaction?: Transaction,
  ): Promise<void> {
    const items = await this.itemModel.findAll({
      where: { sectionId },
      order: ITEMS_ORDER,
      limit: MAX_SCHEDULE_QUERY_ROWS,
      transaction,
    });
    const ordered = [
      ...items.filter((i) => i.type !== AWARD_ITEM).map((i) => i.id),
      ...items.filter((i) => i.type === AWARD_ITEM).map((i) => i.id),
    ];
    await this.persistOrder(ordered, transaction);
  }

  private async assignedEntryIds(competitionId: string): Promise<string[]> {
    const sectionIds = await this.competitionSectionIds(competitionId);
    if (sectionIds.length === 0) return [];
    const items = await this.itemModel.findAll({
      where: {
        sectionId: { [Op.in]: sectionIds },
        type: PERFORMANCE_ITEM,
        entryId: { [Op.ne]: null },
      },
      attributes: ['entryId'],
      limit: MAX_SCHEDULE_QUERY_ROWS,
    });
    return items.map((i) => i.entryId as string);
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
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
      limit: MAX_SCHEDULE_QUERY_ROWS,
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
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.assertCompetition(competitionId);
    if (competition.ownerId === requesterId) return competition;
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
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
