import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { CompetitionAdmin } from '../team/competition-admin.model';
import { Venue } from './venue.model';
import { CreateVenueDto } from './dto/create-venue.dto';

@Injectable()
export class VenuesService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(CompetitionAdmin)
    private readonly competitionAdminModel: typeof CompetitionAdmin,
    @InjectModel(Venue)
    private readonly venueModel: typeof Venue,
  ) {}

  async list(competitionId: string, requesterId: string) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);
    const venues = await this.venueModel.findAll({
      where: { competitionId },
      order: [['createdAt', 'ASC']],
    });
    return venues.map((v) => this.toDto(v));
  }

  async create(
    competitionId: string,
    requesterId: string,
    dto: CreateVenueDto,
  ) {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const venue = await this.venueModel.create({
      competitionId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
    } as CreationAttributes<Venue>);

    return this.toDto(venue);
  }

  async remove(
    competitionId: string,
    venueId: string,
    requesterId: string,
  ): Promise<void> {
    await this.loadCompetitionAndAssertAccess(competitionId, requesterId);

    const venue = await this.venueModel.findOne({
      where: { id: venueId, competitionId },
    });
    if (!venue) {
      throw new NotFoundException('Майданчик не знайдено');
    }
    await venue.destroy();
  }

  /** Керувати майданчиками може власник або будь-який адмін, доданий до команди. */
  private async loadCompetitionAndAssertAccess(
    competitionId: string,
    requesterId: string,
  ): Promise<Competition> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException('Конкурс не знайдено');
    }
    if (competition.ownerId === requesterId) return competition;

    const membership = await this.competitionAdminModel.findOne({
      where: { competitionId, adminId: requesterId },
    });
    if (!membership) {
      throw new ForbiddenException('Немає доступу до цього конкурсу');
    }
    return competition;
  }

  private toDto(venue: Venue) {
    return {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      createdAt: venue.createdAt,
    };
  }
}
