import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { League } from './league.model';
import {
  LEAGUE_NOT_ACTIVE_MESSAGE,
  LEAGUE_NOT_FOUND_MESSAGE,
} from './leagues.constants';

@Injectable()
export class LeaguesService {
  constructor(
    @InjectModel(League)
    private readonly leagueModel: typeof League,
  ) {}

  findAll(): Promise<League[]> {
    return this.leagueModel.findAll({ order: [['name', 'ASC']] });
  }

  findAllActive(): Promise<League[]> {
    return this.leagueModel.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });
  }

  async findByIdOrFail(id: string): Promise<League> {
    const league = await this.leagueModel.findByPk(id);
    if (!league) {
      throw new NotFoundException(LEAGUE_NOT_FOUND_MESSAGE);
    }
    return league;
  }

  async assertActiveLeague(id: string): Promise<League> {
    const league = await this.findByIdOrFail(id);
    if (!league.isActive) {
      throw new BadRequestException(LEAGUE_NOT_ACTIVE_MESSAGE);
    }
    return league;
  }
}
