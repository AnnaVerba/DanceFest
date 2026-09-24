import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { col, CreationAttributes, fn, Op, where as sqlWhere } from 'sequelize';
import { PagedResult, resolvePage } from '../common/pagination';
import { Competition } from './competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { User } from '../users/user.model';
import { PaymentDetails } from '../payment-details/payment-details.model';
import { CompetitionRule } from '../competition-rules/competition-rule.model';
import { AccessLevel } from '../auth/access-level.enum';
import { CreateCompetitionDto } from './dto/create-competition.dto';
import { UpdateCompetitionDto } from './dto/update-competition.dto';
import { isListedOrganizer } from './competition-organizers';
import { NOT_DELETED } from '../users/deleted-user';
import {
  NO_COMPETITION_ACCESS_MESSAGE,
  COMPETITION_OWNER_ONLY_MESSAGE,
  COMPETITION_STATUS_FILTER,
  ISO_DATE_LENGTH,
  NO_ACCOUNT_ORGANIZER_ID,
  ORGANIZER_IDS_MISMATCH_MESSAGE,
  ORGANIZERS_COLUMN,
  ORGANIZERS_SEARCH_SEPARATOR,
  SEARCH_WORDS_SEPARATOR,
} from './competitions.constants';

const OWNER_INCLUDE = [
  { model: User, as: 'owner', attributes: ['id', 'firstName', 'lastName'] },
  { model: PaymentDetails, as: 'paymentDetails' },
];

const DEFAULT_COMPETITIONS_PAGE_SIZE = 24;
const MAX_COMPETITIONS_PAGE_SIZE = 100;
// Sanity ceiling for the year-list scan.
const MAX_COMPETITIONS_SCAN = 5000;

export interface CompetitionListQuery {
  page?: string;
  pageSize?: string;
  q?: string;
  year?: string;
  status?: string;
}

@Injectable()
export class CompetitionsService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(CompetitionRule)
    private readonly competitionRuleModel: typeof CompetitionRule,
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  // `memberId` narrows the list to «Мої конкурси»: competitions that user
  // owns or is on the team of.
  async findAll(
    query: CompetitionListQuery = {},
    memberId?: string,
  ): Promise<PagedResult<Competition>> {
    const { page, pageSize, limit, offset } = resolvePage(
      query.page,
      query.pageSize,
      DEFAULT_COMPETITIONS_PAGE_SIZE,
      MAX_COMPETITIONS_PAGE_SIZE,
    );
    const where: Record<string | symbol, unknown> = {};
    if (memberId) {
      where[Op.or] = [
        { ownerId: memberId },
        { id: { [Op.in]: await this.teamCompetitionIds(memberId) } },
      ];
    }
    const q = query.q?.trim();
    // The search box promises name, city or organizer. Every word of the
    // query must appear in one of them, in any order — «Анна Верба» also
    // finds an organizer typed as «Верба Анна».
    if (q) {
      where[Op.and] = q.split(SEARCH_WORDS_SEPARATOR).map((word) => {
        const pattern = `%${word}%`;
        return {
          [Op.or]: [
            { name: { [Op.iLike]: pattern } },
            { location: { [Op.iLike]: pattern } },
            sqlWhere(
              fn(
                'array_to_string',
                col(ORGANIZERS_COLUMN),
                ORGANIZERS_SEARCH_SEPARATOR,
              ),
              { [Op.iLike]: pattern },
            ),
          ],
        };
      });
    }
    if (query.year && /^\d{4}$/.test(query.year)) {
      where.dateFrom = {
        [Op.between]: [`${query.year}-01-01`, `${query.year}-12-31`],
      };
    }
    Object.assign(where, this.statusWhere(query.status));
    const { rows, count } = await this.competitionModel.findAndCountAll({
      where,
      include: OWNER_INCLUDE,
      order: [['dateFrom', 'DESC']],
      limit,
      offset,
      distinct: true,
    });
    return { rows, total: count, page, pageSize };
  }

  // A day counts as passed once today is strictly after it, so the
  // registration deadline day itself is still open.
  private statusWhere(status?: string): Record<string, unknown> {
    const today = new Date().toISOString().slice(0, ISO_DATE_LENGTH);
    switch (status) {
      case COMPETITION_STATUS_FILTER.REGISTRATION_OPEN:
        return {
          registrationFrom: { [Op.lte]: today },
          registrationTo: { [Op.gte]: today },
        };
      case COMPETITION_STATUS_FILTER.PLANNED:
        return { registrationFrom: { [Op.gt]: today } };
      case COMPETITION_STATUS_FILTER.FINISHED:
        return { dateTo: { [Op.lt]: today } };
      default:
        return {};
    }
  }

  // Competitions the user helps run as a named team admin (not the owner).
  private async teamCompetitionIds(adminId: string): Promise<string[]> {
    const memberships = await this.competitionAdminModel.findAll({
      where: { adminId },
      attributes: ['competitionId'],
      limit: MAX_COMPETITIONS_SCAN,
    });
    return memberships.map((membership) => membership.competitionId);
  }

  // Distinct years for the list's year filter.
  async listYears(): Promise<number[]> {
    const rows = await this.competitionModel.findAll({
      attributes: ['dateFrom'],
      limit: MAX_COMPETITIONS_SCAN,
    });
    const years = new Set<number>();
    for (const r of rows) years.add(new Date(r.dateFrom).getFullYear());
    return [...years].sort((a, b) => b - a);
  }

  async findOne(id: string): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(id, {
      include: OWNER_INCLUDE,
    });
    if (!competition) {
      throw new NotFoundException(`Competition with id ${id} not found`);
    }
    return competition;
  }

  async create(
    dto: CreateCompetitionDto,
    ownerId: string,
  ): Promise<Competition> {
    const organizerIds = this.resolveOrganizerIds(
      dto.organizers,
      dto.organizerIds,
    );
    const competition = await this.competitionModel.create({
      ...dto,
      organizerIds,
      ownerId,
    } as CreationAttributes<Competition>);

    await this.competitionRuleModel.create({
      competitionId: competition.id,
    } as CreationAttributes<CompetitionRule>);
    await this.syncOrganizerAccess(competition, []);

    return competition;
  }

  async update(
    id: string,
    dto: UpdateCompetitionDto,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<Competition> {
    const competition = await this.findOne(id);
    await this.assertCanEdit(competition, requesterId, requesterLevel);
    const previousOrganizerIds = competition.organizerIds;
    const organizerIds = this.resolveOrganizerIds(
      dto.organizers,
      dto.organizerIds,
    );
    if (!organizerIds) return competition.update(dto);
    await competition.update({ ...dto, organizerIds });
    await this.syncOrganizerAccess(competition, previousOrganizerIds);
    return competition;
  }

  // Same "organizer/owner or admin" edit permission as update() — exposed
  // for other modules (e.g. music-export) that need to gate an action on a
  // competition without going through the full update() flow.
  async loadAndAssertCanEdit(
    id: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<Competition> {
    const competition = await this.findOne(id);
    await this.assertCanEdit(competition, requesterId, requesterLevel);
    return competition;
  }

  async remove(
    id: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<void> {
    const competition = await this.findOne(id);
    await this.assertOwner(competition, requesterId, requesterLevel);
    await competition.destroy();
  }

  // One id per organizer name, in the same order; a name typed without an
  // account gets the nil id.
  private resolveOrganizerIds(
    organizers?: string[],
    organizerIds?: string[],
  ): string[] | undefined {
    if (!organizers) {
      if (organizerIds) {
        throw new BadRequestException(ORGANIZER_IDS_MISMATCH_MESSAGE);
      }
      return undefined;
    }
    if (!organizerIds) return organizers.map(() => NO_ACCOUNT_ORGANIZER_ID);
    if (organizerIds.length !== organizers.length) {
      throw new BadRequestException(ORGANIZER_IDS_MISMATCH_MESSAGE);
    }
    return organizerIds;
  }

  // The team mirrors the organizers field: listed organizer accounts join
  // it, accounts dropped from the list leave it. Ids that are not a
  // confirmed organizer account (or are the owner) are skipped.
  private async syncOrganizerAccess(
    competition: Competition,
    previousOrganizerIds: string[],
  ): Promise<void> {
    const currentIds = competition.organizerIds;
    const removedIds = previousOrganizerIds.filter(
      (organizerId) => !currentIds.includes(organizerId),
    );
    if (removedIds.length > 0) {
      await this.competitionAdminModel.destroy({
        where: {
          competitionId: competition.id,
          adminId: { [Op.in]: removedIds },
        },
      });
    }

    const organizers = await this.userModel.findAll({
      where: {
        ...NOT_DELETED,
        id: { [Op.in]: currentIds, [Op.ne]: competition.ownerId },
        confirmed: true,
        accessLevel: AccessLevel.ORGANIZER,
      },
      attributes: ['id'],
    });
    const members = await this.competitionAdminModel.findAll({
      where: { competitionId: competition.id },
      attributes: ['adminId'],
    });
    const memberIds = new Set(members.map((member) => member.adminId));
    const newMembers = organizers
      .filter((organizer) => !memberIds.has(organizer.id))
      .map((organizer) => ({
        competitionId: competition.id,
        adminId: organizer.id,
      }));
    if (newMembers.length > 0) {
      await this.competitionAdminModel.bulkCreate(
        newMembers as CreationAttributes<CompetitionAdmin>[],
      );
    }
  }

  private async assertCanEdit(
    competition: Competition,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<void> {
    // An admin can edit any competition; an organizer only their own.
    if (requesterLevel === AccessLevel.ADMIN) return;
    if (competition.ownerId === requesterId) return;
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId: competition.id, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException(NO_COMPETITION_ACCESS_MESSAGE);
    }
  }

  private async assertOwner(
    competition: Competition,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<void> {
    // An admin may delete any competition; an organizer only their own —
    // or one that lists them among its organizers.
    if (requesterLevel === AccessLevel.ADMIN) return;
    if (competition.ownerId === requesterId) return;
    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId: competition.id, adminId: requesterId },
    });
    if (!membership || !isListedOrganizer(competition, requesterId)) {
      throw new ForbiddenException(COMPETITION_OWNER_ONLY_MESSAGE);
    }
  }
}
