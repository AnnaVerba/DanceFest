import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
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

  async findAll(
    query: CompetitionListQuery = {},
  ): Promise<PagedResult<Competition>> {
    const { page, pageSize, limit, offset } = resolvePage(
      query.page,
      query.pageSize,
      DEFAULT_COMPETITIONS_PAGE_SIZE,
      MAX_COMPETITIONS_PAGE_SIZE,
    );
    const where: Record<string, unknown> = {};
    const q = query.q?.trim();
    if (q) where.name = { [Op.iLike]: `%${q}%` };
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

  // Sets the deadline after which an entry's track can no longer be
  // uploaded, replaced, or removed (see TracksService). Same edit
  // permission as the rest of the competition (organizer/owner or admin).
  async updateMusicDeadline(
    id: string,
    musicDeadline: string,
    requesterId: string,
    requesterLevel: AccessLevel,
  ): Promise<Competition> {
    const competition = await this.findOne(id);
    await this.assertCanEdit(competition, requesterId, requesterLevel);
    competition.musicDeadline = musicDeadline;
    await competition.save();
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
