import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import type { AuthenticatedUser } from '../auth/authenticated-user.interface';
import { CategoriesService } from '../categories/categories.service';
import { LEAGUE_CATEGORY_TYPE } from '../categories/category.model';
import type { Category } from '../categories/category.model';
import { CategoryTemplate } from '../category-templates/category-template.model';
import { normalizeLeagueNames } from '../category-templates/normalize-league-names';
import { TemplateNomination } from '../category-templates/template-nomination.model';
import { Entry } from '../entries/entry.model';
import { EntriesService } from '../entries/entries.service';
import { Nomination } from '../nominations/nomination.model';
import { ScheduleService } from '../schedule/schedule.service';
import { AwardPerformanceResolver } from './award-performance-resolver';
import { AwardSettings } from './award-settings.model';
import { MAX_AWARDS_QUERY_ROWS } from './awards.constants';
import type { AwardsReport } from './awards-report.interface';
import { buildAwardLines } from './build-award-lines';
import { calculateAwards } from './calculate-awards';
import { UpdateAllMedalLeaguesDto } from './dto/update-all-medal-leagues.dto';
import { UpdateAwardOverrideDto } from './dto/update-award-override.dto';
import { UpdateAwardSystemDto } from './dto/update-award-system.dto';
import { specialNameKey } from './special-name-key';

@Injectable()
export class AwardsService {
  constructor(
    @InjectModel(AwardSettings)
    private readonly settingsModel: typeof AwardSettings,
    @InjectModel(Entry)
    private readonly entryModel: typeof Entry,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
    @InjectModel(CategoryTemplate)
    private readonly templateModel: typeof CategoryTemplate,
    @InjectModel(TemplateNomination)
    private readonly templateNominationModel: typeof TemplateNomination,
    private readonly entriesService: EntriesService,
    private readonly scheduleService: ScheduleService,
    private readonly categoriesService: CategoriesService,
  ) {}

  async report(
    competitionId: string,
    user: AuthenticatedUser,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    return this.buildReport(competitionId);
  }

  async setAwardSystem(
    competitionId: string,
    user: AuthenticatedUser,
    dto: UpdateAwardSystemDto,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    const settings = await this.settingsOf(competitionId);
    await settings.update({ awardSystem: dto.awardSystem });
    return this.buildReport(competitionId);
  }

  // Changes the «медаль кожному» leagues for this competition only — the
  // category template keeps its own ticks. null goes back to the template.
  async setAllMedalLeagues(
    competitionId: string,
    user: AuthenticatedUser,
    dto: UpdateAllMedalLeaguesDto,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    const settings = await this.settingsOf(competitionId);
    await settings.update({
      allMedalLeagues:
        dto.leagues === null ? null : normalizeLeagueNames(dto.leagues),
    });
    return this.buildReport(competitionId);
  }

  async setOverride(
    competitionId: string,
    user: AuthenticatedUser,
    dto: UpdateAwardOverrideDto,
  ): Promise<AwardsReport> {
    await this.assertStaff(competitionId, user);
    const settings = await this.settingsOf(competitionId);
    const overrides = { ...settings.overrides };
    if (dto.value === null) delete overrides[dto.key];
    else overrides[dto.key] = dto.value;
    await settings.update({ overrides });
    return this.buildReport(competitionId);
  }

  private async assertStaff(
    competitionId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    await this.entriesService.loadCompetitionAndAssertAccess(
      competitionId,
      user.id,
      user.accessLevel,
    );
  }

  private async settingsOf(competitionId: string): Promise<AwardSettings> {
    const [settings] = await this.settingsModel.findOrCreate({
      where: { competitionId },
      defaults: { competitionId } as CreationAttributes<AwardSettings>,
    });
    return settings;
  }

  // Only exits placed in the program count — what really goes on stage.
  private async buildReport(competitionId: string): Promise<AwardsReport> {
    const settings = await this.settingsOf(competitionId);
    const entryIds = await this.scheduleService.assignedEntryIds(competitionId);
    const entries =
      entryIds.length === 0
        ? []
        : await this.entryModel.findAll({
            where: { competitionId, id: { [Op.in]: entryIds } },
            limit: MAX_AWARDS_QUERY_ROWS,
          });
    const nominations = await this.nominationModel.findAll({
      where: { competitionId },
      limit: MAX_AWARDS_QUERY_ROWS,
    });
    const templateIds = this.templateIdsOf(nominations);
    const categoriesById = await this.categoriesById(nominations);

    const templateAllMedalLeagues =
      await this.templateAllMedalLeagues(templateIds);
    // The organizer's own list wins; the template only supplies the default.
    const allMedalLeagues = settings.allMedalLeagues ?? templateAllMedalLeagues;

    const resolver = new AwardPerformanceResolver(
      new Map(nominations.map((n) => [n.id, n])),
      allMedalLeagues,
      await this.specialNamesByKey(templateIds),
      categoriesById,
    );

    const calculation = calculateAwards({
      awardSystem: settings.awardSystem,
      performances: entries.map((entry) => resolver.resolve(entry)),
    });

    return {
      awardSystem: settings.awardSystem,
      performancesInProgram: calculation.performancesInProgram,
      leagues: this.leagueNamesOf(categoriesById, allMedalLeagues),
      allMedalLeagues,
      templateAllMedalLeagues,
      allMedalLeaguesCustomized: settings.allMedalLeagues !== null,
      lines: buildAwardLines(calculation, settings.overrides ?? {}),
    };
  }

  private templateIdsOf(nominations: Nomination[]): string[] {
    return [
      ...new Set(
        nominations
          .map((n) => n.templateId)
          .filter((id): id is string => id !== null),
      ),
    ];
  }

  private async templateAllMedalLeagues(
    templateIds: string[],
  ): Promise<string[]> {
    if (templateIds.length === 0) return [];
    const templates = await this.templateModel.findAll({
      where: { id: { [Op.in]: templateIds } },
      attributes: ['id', 'allMedalLeagues'],
    });
    return [
      ...new Set(templates.flatMap((t) => t.allMedalLeagues ?? [])),
    ].sort();
  }

  // Every league the competition's nominations use, plus any league still on
  // the «медаль кожному» list, so a stale tick can always be taken off.
  private leagueNamesOf(
    categoriesById: Map<string, Category>,
    allMedalLeagues: string[],
  ): string[] {
    const fromNominations = [...categoriesById.values()]
      .filter((category) => category.type === LEAGUE_CATEGORY_TYPE)
      .map((category) => category.name.trim());
    return [...new Set([...fromNominations, ...allMedalLeagues])].sort();
  }

  // Existing data: the bare name of a special category lives on the
  // template nomination (template_nominations.specialName).
  private async specialNamesByKey(
    templateIds: string[],
  ): Promise<Map<string, string>> {
    if (templateIds.length === 0) return new Map();
    const specials = await this.templateNominationModel.findAll({
      where: {
        templateId: { [Op.in]: templateIds },
        isSpecial: true,
        specialName: { [Op.ne]: null },
      },
      attributes: ['templateId', 'categoryIds', 'specialName'],
      limit: MAX_AWARDS_QUERY_ROWS,
    });
    return new Map(
      specials.map((s) => [
        specialNameKey(s.templateId, s.categoryIds ?? []),
        s.specialName as string,
      ]),
    );
  }

  private async categoriesById(
    nominations: Nomination[],
  ): Promise<Map<string, Category>> {
    const ids = [...new Set(nominations.flatMap((n) => n.categoryIds ?? []))];
    const categories = await this.categoriesService.findByIds(ids);
    return new Map(categories.map((c) => [c.id, c]));
  }
}
