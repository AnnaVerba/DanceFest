import {
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
import {
  NO_COMPETITION_ACCESS_MESSAGE,
  COMPETITION_OWNER_ONLY_MESSAGE,
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
    const competition = await this.competitionModel.create({
      ...dto,
      ownerId,
    } as CreationAttributes<Competition>);

    await this.competitionRuleModel.create({
      competitionId: competition.id,
    } as CreationAttributes<CompetitionRule>);

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
    return competition.update(dto);
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

  async remove(id: string, requesterId: string): Promise<void> {
    const competition = await this.findOne(id);
    this.assertOwner(competition, requesterId);
    await competition.destroy();
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

  private assertOwner(competition: Competition, requesterId: string): void {
    if (competition.ownerId !== requesterId) {
      throw new ForbiddenException(COMPETITION_OWNER_ONLY_MESSAGE);
    }
  }
}
