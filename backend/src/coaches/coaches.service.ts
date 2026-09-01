import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { CreationAttributes, Op } from 'sequelize';
import { Coach } from './coach.model';
import { COACH_NOT_FOUND_MESSAGE } from './coaches.constants';
import { CreateCoachData } from './create-coach.data';

@Injectable()
export class CoachesService {
  constructor(
    @InjectModel(Coach)
    private readonly coachModel: typeof Coach,
  ) {}

  findAll(): Promise<Coach[]> {
    return this.coachModel.findAll({ order: [['lastName', 'ASC']] });
  }

  findById(id: string): Promise<Coach | null> {
    return this.coachModel.findByPk(id);
  }

  async findByIdOrFail(id: string): Promise<Coach> {
    const coach = await this.findById(id);
    if (!coach) {
      throw new NotFoundException(COACH_NOT_FOUND_MESSAGE);
    }
    return coach;
  }

  findByEmail(email: string): Promise<Coach | null> {
    return this.coachModel.findOne({ where: { email } });
  }

  async existsByEmailOrPhone(email: string, phone: string): Promise<boolean> {
    const count = await this.coachModel.count({
      where: { [Op.or]: [{ email }, { phone }] },
    });
    return count > 0;
  }

  create(data: CreateCoachData): Promise<Coach> {
    return this.coachModel.create(data as CreationAttributes<Coach>);
  }
}
