import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes } from 'sequelize';
import { Competition } from '../competitions/competition.model';
import { Nomination } from '../nominations/nomination.model';
import { Venue } from './venue.model';
import { CreateVenueDto } from './dto/create-venue.dto';
import { VENUE_NOT_FOUND_MESSAGE } from './venues.constants';
import { COMPETITION_NOT_FOUND_MESSAGE } from '../competitions/competitions.constants';

@Injectable()
export class VenuesService {
  constructor(
    @InjectModel(Competition)
    private readonly competitionModel: typeof Competition,
    @InjectModel(Venue)
    private readonly venueModel: typeof Venue,
    @InjectModel(Nomination)
    private readonly nominationModel: typeof Nomination,
  ) {}

  // Public: any visitor may see a competition's venues.
  async list(competitionId: string) {
    await this.assertCompetitionExists(competitionId);
    const [venues, nominationCounts] = await Promise.all([
      this.venueModel.findAll({
        where: { competitionId },
        order: [['createdAt', 'ASC']],
      }),
      this.countNominationsByVenue(competitionId),
    ]);
    return venues.map((v) => this.toDto(v, nominationCounts.get(v.id) ?? 0));
  }

  // The controller restricts these to ORGANIZER and above.
  async create(competitionId: string, dto: CreateVenueDto) {
    await this.assertCompetitionExists(competitionId);

    const venue = await this.venueModel.create({
      competitionId,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
    } as CreationAttributes<Venue>);

    return this.toDto(venue, 0);
  }

  async remove(competitionId: string, venueId: string): Promise<void> {
    await this.assertCompetitionExists(competitionId);

    const venue = await this.venueModel.findOne({
      where: { id: venueId, competitionId },
    });
    if (!venue) {
      throw new NotFoundException(VENUE_NOT_FOUND_MESSAGE);
    }
    await venue.destroy();
  }

  private async assertCompetitionExists(competitionId: string): Promise<void> {
    const competition = await this.competitionModel.findByPk(competitionId);
    if (!competition) {
      throw new NotFoundException(COMPETITION_NOT_FOUND_MESSAGE);
    }
  }

  private async countNominationsByVenue(
    competitionId: string,
  ): Promise<Map<string, number>> {
    const rows = await this.nominationModel.count({
      where: { competitionId },
      group: ['venueId'],
    });
    return new Map(rows.map((row) => [row.venueId as string, Number(row.count)]));
  }

  private toDto(venue: Venue, nominationCount: number) {
    return {
      id: venue.id,
      name: venue.name,
      description: venue.description,
      nominationCount,
      createdAt: venue.createdAt,
    };
  }
}
